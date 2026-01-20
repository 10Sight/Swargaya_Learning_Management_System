
import { pool } from "../db/connectDB.js";

const migrate = async () => {
    try {
        console.log("Starting migration: Single Instructor -> Many Instructors...");

        // 1. Add 'instructors' column if not exists
        try {
            await pool.query("ALTER TABLE departments ADD instructors VARCHAR(MAX);");
            console.log("Added 'instructors' column.");
        } catch (e) {
            if (e.message.includes("Column names in each table must be unique")) {
                console.log("'instructors' column already exists, skipping add.");
            } else {
                throw e;
            }
        }

        // 2. Migrate existing 'instructor' (single ID) to 'instructors' (JSON array)
        // Only for rows where instructors is NULL and instructor is NOT NULL
        const [rows] = await pool.query("SELECT id, instructor FROM departments WHERE instructors IS NULL AND instructor IS NOT NULL");
        console.log(`Found ${rows.length} departments to migrate.`);

        for (const row of rows) {
            if (row.instructor) {
                const instructorsArray = JSON.stringify([row.instructor]); // ["123"]
                await pool.query("UPDATE departments SET instructors = ? WHERE id = ?", [instructorsArray, row.id]);
                console.log(`Migrated Department ${row.id}: ${row.instructor} -> ${instructorsArray}`);
            }
        }

        // 3. Drop 'instructor' column? 
        // Safer to keep it for now as 'deprecated' fallback, but we won't use it in code.
        // Or we can just leave it. The plan said "Drop or ignore". Ignoring is safer for rollback.

        console.log("Migration completed successfully.");
        process.exit(0);

    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
};

migrate();
