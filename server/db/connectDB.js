import mysql from "mysql2/promise";
import logger from "../logger/winston.logger.js";

import ENV from "../configs/env.config.js";

const pool = mysql.createPool({
    host: ENV.DB_HOST,
    user: ENV.DB_USER,
    port: ENV.DB_PORT || 3306,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        logger.info("MySQL Connected to 'learning management system'");
        connection.release();
    } catch (error) {
        logger.error("MySQL Connection Failed", error.message);
        process.exit(1);
    }
};

export { pool };
export default connectDB;