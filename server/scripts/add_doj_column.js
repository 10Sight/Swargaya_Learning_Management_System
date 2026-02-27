import { pool } from "../db/connectDB.js";

const migrate = async () => {
    try {
        console.log("Checking if dateOfJoining column needs to be added...");
        const query = `
            IF COL_LENGTH('dbo.users', 'dateOfJoining') IS NULL 
            BEGIN 
                ALTER TABLE dbo.users ADD dateOfJoining DATETIME;
                PRINT 'Column dateOfJoining added successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Column dateOfJoining already exists.';
            END
        `;

        await pool.query(query);
        console.log("Migration check complete.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
