import { pool } from "./db/connectDB.js";

const runMigration = async () => {
    try {
        console.log("Starting migration...");
        const query = `
            IF NOT EXISTS (
              SELECT * FROM sys.columns 
              WHERE object_id = OBJECT_ID(N'[dbo].[progress]') 
              AND name = 'levelHistory'
            )
            BEGIN
              ALTER TABLE progress ADD levelHistory VARCHAR(MAX);
              PRINT 'Column levelHistory added successfully.';
            END
            ELSE
            BEGIN
              PRINT 'Column levelHistory already exists.';
            END
        `;
        await pool.query(query);
        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

runMigration();
