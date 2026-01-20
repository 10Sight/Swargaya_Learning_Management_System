import connectDB, { pool } from "./db/connectDB.js";

const test = async () => {
    try {
        console.log("Testing MSSQL Connection...");
        await connectDB();
        console.log("Connection method returned successfully.");

        console.log("Testing simple query...");
        try {
            const [rows] = await pool.query("SELECT 1 as val");
            console.log("Query Result:", rows);
        } catch (qErr) {
            console.error("Query failed:", qErr);
        }
        process.exit(0);
    } catch (error) {
        console.error("Verification FAILED with Error:", error);
        process.exit(1);
    }
};

test();
