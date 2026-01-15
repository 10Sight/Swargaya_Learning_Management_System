import { pool } from "./db/connectDB.js";
import 'dotenv/config';

const newTemplate = `
<div class="certificate-container" style="font-family: Arial, sans-serif; border: 2px solid #000; padding: 20px; max-width: 800px; margin: 0 auto; background: #fff;">
    <div style="background-color: #3b82f6; height: 20px; margin-bottom: 20px;"></div>
    
    <div style="background-color: #fffbeb; padding: 20px;">
        <p>
            <strong>Mr. / Mrs.</strong> <span style="text-decoration: underline; padding: 0 10px;">{{studentName}}</span>
            &nbsp;&nbsp;&nbsp;
            <strong>Department</strong> <span style="text-decoration: underline; padding: 0 10px;">{{departmentName}}</span>
            &nbsp;&nbsp;&nbsp;
            <strong>Employee ID</strong> <span style="text-decoration: underline; padding: 0 10px;">{{employeeId}}</span>
        </p>

        <p>
            who had started his/her training from ( <span style="text-decoration: underline; padding: 0 10px;">{{startDate}}</span> )
            to ( <span style="text-decoration: underline; padding: 0 10px;">{{completionDate}}</span> )
        </p>
        
        <p>has successfully completed ( Integrated/ Refresher ) course through the following DOJO Gates.</p>
    </div>

    <div style="border: 2px solid #000; display: flex;">
        <div style="width: 50%; border-right: 2px solid #000;">
            <div style="background-color: #dbeafe; padding: 10px; font-weight: bold; text-align: center; border-bottom: 2px solid #000;">DOJO Gates</div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #eee;">
                    <th style="border: 1px solid #000; padding: 8px;">Level</th>
                    <th style="border: 1px solid #000; padding: 8px;">Level Certified Date</th>
                </tr>
                <tr style="background-color: #3b82f6; color: white;">
                    <td style="border: 1px solid #000; padding: 8px;">L1</td>
                    <td style="border: 1px solid #000; padding: 8px;">{{level1Date}}</td>
                </tr>
                <tr style="background-color: #f97316; color: white;">
                    <td style="border: 1px solid #000; padding: 8px;">L2</td>
                    <td style="border: 1px solid #000; padding: 8px;">{{level2Date}}</td>
                </tr>
                <tr style="background-color: #10b981; color: white;">
                    <td style="border: 1px solid #000; padding: 8px;">L3</td>
                    <td style="border: 1px solid #000; padding: 8px;">{{level3Date}}</td>
                </tr>
            </table>
        </div>
        
        <div style="width: 50%; background-color: #dbeafe; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
            <div style="margin-bottom: 20px;">
                <!-- User Image Square -->
                <div style="width: 100px; height: 100px; border-radius: 12px; overflow: hidden; border: 2px solid #333; background: #fff; margin: 0 auto;">
                    <img src="{{userImage}}" alt="User" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'"/>
                </div>
            </div>
            
            <!-- Pie Chart -->
            <div style="width: 60px; height: 60px; {{pieChart}}; border: 2px solid #333; margin-bottom: 10px;"></div>
            
            <div style="font-weight: bold;">Current Skill Level - {{level}}</div>
        </div>
    </div>

    <div style="margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; display: flex; justify-content: space-between;">
         <div>Note:- Review Frequency after 3 month</div>
         <div>
             <span style="margin-right: 50px;">1st Review</span>
             <span>4th review</span>
         </div>
    </div>
</div>
`;

const update = async () => {
    try {
        console.log("Updating default certificate template...");
        const [result] = await pool.query("UPDATE certificate_templates SET template = ? WHERE isDefault = 1", [newTemplate]);

        if (result.affectedRows === 0) {
            console.log("No default template found. Updating first active template...");
            const [rows] = await pool.query("SELECT id FROM certificate_templates WHERE isActive = 1 LIMIT 1");
            if (rows.length > 0) {
                await pool.query("UPDATE certificate_templates SET template = ? WHERE id = ?", [newTemplate, rows[0].id]);
                console.log("Updated template ID:", rows[0].id);
            } else {
                console.log("No active templates found to update.");
            }
        } else {
            console.log("Default template updated successfully.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error updating template:", error);
        process.exit(1);
    }
};

update();
