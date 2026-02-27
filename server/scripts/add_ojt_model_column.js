import { pool } from "../db/connectDB.js";

const migrate = async () => {
    try {
        console.log("Checking if model column needs to be added to on_job_trainings...");
        const query = `
            IF COL_LENGTH('dbo.on_job_trainings', 'model') IS NULL 
            BEGIN 
                ALTER TABLE dbo.on_job_trainings ADD model VARCHAR(255);
                PRINT 'Column model added successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Column model already exists.';
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
