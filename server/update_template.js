import { pool } from "./db/connectDB.js";

const updateTemplate = async () => {
    try {
        console.log("Fetching default template...");
        let [rows] = await pool.query("SELECT TOP 1 * FROM certificate_templates WHERE isDefault = 1");

        if (rows.length === 0) {
            console.log("No default template found, trying fallback...");
            [rows] = await pool.query("SELECT TOP 1 * FROM certificate_templates WHERE isActive = 1 ORDER BY createdAt ASC");
        }

        if (rows.length === 0) {
            console.log("No templates found at all.");
            process.exit(0);
        }

        let template = rows[0];
        let html = template.template;

        // Check if table header already exists
        if (!html.includes("Level Completion History")) {
            console.log("Adding level completion history table to template ID:", template.id);

            const tableHtml = `
             <div style="margin-top: 30px; width: 80%; margin-left: auto; margin-right: auto;">
                <h3 style="text-align: center; font-family: sans-serif; color: #333;">Level Completion History</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-family: sans-serif;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="border: 1px solid #d1d5db; padding: 10px;">Level</th>
                            <th style="border: 1px solid #d1d5db; padding: 10px;">Completion Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">Level 1 <span style="font-size: 0.8em; color: #666;">(Beginner)</span></td>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">{{level1Date}}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">Level 2 <span style="font-size: 0.8em; color: #666;">(Intermediate)</span></td>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">{{level2Date}}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">Level 3 <span style="font-size: 0.8em; color: #666;">(Advanced)</span></td>
                            <td style="border: 1px solid #d1d5db; padding: 8px;">{{level3Date}}</td>
                        </tr>
                    </tbody>
                </table>
             </div>
             `;

            const lastDivIndex = html.lastIndexOf("</div>");
            if (lastDivIndex !== -1) {
                html = html.substring(0, lastDivIndex) + tableHtml + html.substring(lastDivIndex);
            } else {
                html += tableHtml;
            }

            // Update placeholders
            let placeholders = [];
            try {
                placeholders = typeof template.placeholders === 'string' ? JSON.parse(template.placeholders) : (template.placeholders || []);
            } catch (e) {
                placeholders = [];
            }

            ['level1Date', 'level2Date', 'level3Date'].forEach(p => {
                if (!placeholders.includes(p)) placeholders.push(p);
            });

            await pool.query(
                "UPDATE certificate_templates SET template = ?, placeholders = ? WHERE id = ?",
                [html, JSON.stringify(placeholders), template.id]
            );
            console.log("Template updated successfully.");
        } else {
            console.log("Template already contains level completion history table.");
        }

    } catch (error) {
        console.error("Error updating template:", error);
    }
    process.exit(0);
};

updateTemplate();
