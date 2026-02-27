import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

const migrateVarcharToNvarchar = async () => {
    try {
        console.log("Starting migration: VARCHAR to NVARCHAR...");

        // 1. Get all VARCHAR columns from the database
        const [columns] = await pool.query(`
            SELECT 
                TABLE_NAME, 
                COLUMN_NAME, 
                CHARACTER_MAXIMUM_LENGTH, 
                IS_NULLABLE
            FROM 
                INFORMATION_SCHEMA.COLUMNS 
            WHERE 
                DATA_TYPE = 'varchar' 
                AND TABLE_SCHEMA = 'dbo'
        `);

        console.log(`Found ${columns.length} VARCHAR columns to migrate.`);

        for (const col of columns) {
            const { TABLE_NAME, COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE } = col;

            // Determine the new type and length
            let newType = 'NVARCHAR';
            let length = CHARACTER_MAXIMUM_LENGTH;
            if (length === -1) {
                length = 'MAX';
            }

            const nullableStr = IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';

            console.log(`Migrating ${TABLE_NAME}.${COLUMN_NAME} to ${newType}(${length}) ${nullableStr}...`);

            try {
                // Generate and execute ALTER TABLE statement
                // Note: If there are indexes on these columns, this might fail.
                // However, for NVARCHAR conversion, SQL Server often handles it if the size is consistent.
                const alterQuery = `ALTER TABLE [${TABLE_NAME}] ALTER COLUMN [${COLUMN_NAME}] ${newType}(${length}) ${nullableStr}`;
                await pool.query(alterQuery);
            } catch (colError) {
                console.error(`Failed to migrate ${TABLE_NAME}.${COLUMN_NAME}:`, colError.message);
                // Continue with other columns if one fails (e.g. due to index dependencies)
            }
        }

        console.log("Migration completed.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateVarcharToNvarchar();
