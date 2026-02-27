

import { pool } from "./db/connectDB.js";

const runMigration = async () => {
  try {
    console.log("Starting migration: Dropping unique_email constraint...");
    const query = `
            IF EXISTS (SELECT * FROM sys.objects WHERE type = 'UQ' AND name = 'unique_email')
            BEGIN
                ALTER TABLE users DROP CONSTRAINT unique_email;
                PRINT 'Constraint unique_email dropped.';
            END
            ELSE
            BEGIN
                PRINT 'Constraint unique_email does not exist.';
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
