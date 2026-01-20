import { pool } from "./db/connectDB.js";

const viewTemplate = async () => {
    try {
        let rows = (await pool.query("SELECT TOP 1 * FROM certificate_templates WHERE isDefault = 1"))[0];
        if (rows.length === 0) {
            rows = (await pool.query("SELECT TOP 1 * FROM certificate_templates WHERE isActive = 1 ORDER BY createdAt ASC"))[0];
        }

        if (rows.length > 0) {
            console.log("Template ID:", rows[0].id);
            console.log("HTML Content Sample:");
            console.log(rows[0].template.substring(rows[0].template.length - 2000)); // Show last 2000 chars
        } else {
            console.log("No templates found.");
        }
    } catch (e) { console.error(e); }
    process.exit(0);
};
viewTemplate();
