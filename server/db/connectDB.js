import sql from "mssql";
import logger from "../logger/winston.logger.js";
import ENV from "../configs/env.config.js";

const config = {
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    server: ENV.DB_HOST.split('\\')[0], // MMMPUNDBSER
    database: ENV.DB_NAME,
    options: {
        instanceName: ENV.DB_HOST.includes('\\')
            ? ENV.DB_HOST.split('\\')[1]
            : undefined,
        encrypt: false,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};


let poolConnection = null;
let connectionPromise = null;

const convertQuery = (query, params = []) => {
    let index = 0;
    // Replace ? with @p0, @p1, etc.
    const mssqlQuery = query.replace(/\?/g, () => `@p${index++}`);
    return mssqlQuery;
};

// Wrapper object to mimic mysql2/promise pool
const promisePool = {
    query: async (queryText, params = []) => {
        try {
            if (!poolConnection) await connectDB();

            const request = poolConnection.request();
            const convertedSql = convertQuery(queryText, params);

            params.forEach((param, index) => {
                request.input(`p${index}`, param);
            });

            const result = await request.query(convertedSql);
            // Return [rows, fields] format (fields is metadata, often ignored in app code, sending empty obj/null)
            return [result.recordset, result.output];
        } catch (error) {
            // Map common errors or just throw
            console.error("MSSQL Query Error:", error);
            throw error;
        }
    },
    getConnection: async () => {
        if (!poolConnection) await connectDB();

        // Transaction wrapper
        let transaction = null;

        return {
            query: async (queryText, params = []) => {
                const convertedSql = convertQuery(queryText, params);
                const request = transaction ? new sql.Request(transaction) : poolConnection.request();

                params.forEach((param, index) => {
                    request.input(`p${index}`, param);
                });

                const result = await request.query(convertedSql);
                return [result.recordset, result.output];
            },
            beginTransaction: async () => {
                transaction = new sql.Transaction(poolConnection);
                await transaction.begin();
            },
            commit: async () => {
                if (transaction) {
                    await transaction.commit();
                    transaction = null;
                }
            },
            rollback: async () => {
                if (transaction) {
                    await transaction.rollback();
                    transaction = null;
                }
            },
            release: () => {
                // No-op in mssql pool model unless we manually acquire connection from pool (not typical for simple usage)
                transaction = null;
            }
        };
    },
    end: async () => {
        if (poolConnection) {
            await poolConnection.close();
            poolConnection = null;
            connectionPromise = null;
        }
    }
};

const connectDB = async () => {
    if (poolConnection) return poolConnection;
    if (connectionPromise) return connectionPromise;

    connectionPromise = (async () => {
        try {
            console.log("Connecting to MSSQL...");
            const pool = await sql.connect(config);
            poolConnection = pool;
            logger.info("MSSQL Connected to 'learning management system'");

            poolConnection.on('error', err => {
                logger.error('MSSQL Pool Error', err);
            });

            return poolConnection;
        } catch (error) {
            connectionPromise = null; // Allow retry if needed
            logger.error("MSSQL Connection Failed", error.message);
            console.error("MSSQL Connection Failed Full Error:", error);
            process.exit(1);
        }
    })();

    return connectionPromise;
};

export { promisePool as pool };
export default connectDB;