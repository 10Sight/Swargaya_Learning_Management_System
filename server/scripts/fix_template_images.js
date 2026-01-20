
import { pool } from "../db/connectDB.js";

const fix = async () => {
    try {
        console.log("Fetching templates...");
        const [rows] = await pool.query("SELECT id, template FROM certificate_templates WHERE template LIKE '%via.placeholder.com%'");

        console.log(`Found ${rows.length} templates to patch.`);

        for (const row of rows) {
            let html = row.template;
            // Global replace
            html = html.split('via.placeholder.com').join('placehold.co');

            await pool.query("UPDATE certificate_templates SET template = ? WHERE id = ?", [html, row.id]);
            console.log(`Patched template ${row.id}`);
        }

        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
fix();
