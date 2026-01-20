
import { pool } from "../db/connectDB.js";

const fix = async () => {
    try {
        console.log("Connecting...");
        // T-SQL syntax validation
        const q = "DELETE FROM skill_matrices WHERE line = 'undefined' OR department = 'undefined'";
        const res = await pool.query(q);
        console.log(`Deleted ${res.rowsAffected[0]} rows.`);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
fix();
