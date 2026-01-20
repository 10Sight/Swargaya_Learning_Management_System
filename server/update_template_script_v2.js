import { pool } from "./db/connectDB.js";
import 'dotenv/config';

const newTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOJO Certificate</title>
</head>
<body>
    <div class="certificate-container">
        <!-- Header Section -->
        <div class="header">
            <div class="header-text">
                <h1>CERTIFICATION</h1>
                <h2>THIS IS TO CERTIFY THAT</h2>
            </div>
            <div class="brand-logo">
                <img src="/motherson+marelli.png" alt="Marelli Motherson" />
            </div>
        </div>
    
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
                        <img src="{{userImage}}" alt="User" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/150'"/>
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
</body>
</html>`;

const newStyles = `
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; }
.certificate-container { width: 800px; margin: 0 auto; border: 2px solid #000; background-color: #fff9e6; position: relative; }
.header { background-color: #2b78c5; color: white; padding: 20px; display: flex; justify-content: center; align-items: center; position: relative; border-bottom: 2px solid #000; }
.header-text { text-align: center; }
.header h1 { margin: 0; font-size: 32px; font-weight: bold; text-transform: uppercase; }
.header h2 { margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000; }
.brand-logo { position: absolute; right: 10px; top: 5px; background: white; padding: 5px; }
.brand-logo img { height: 60px; width: auto; }
.candidate-info { padding: 20px 30px; font-weight: bold; font-size: 14px; line-height: 1.8; }
.label { margin-right: 5px; }
.underline { display: inline-block; border-bottom: 1px solid #000; padding: 0 10px; margin-right: 15px; min-width: 50px; text-align: center; }
.training-declaration { margin-top: 15px; }
.levels-container { border-top: 2px solid #000; border-bottom: 2px solid #000; background-color: #dbebf7; }
.level-header { text-align: center; font-weight: bold; font-size: 18px; padding: 8px; border-bottom: 2px solid #000; }
.main-grid { display: flex; }
.blue-box { width: 120px; height: 120px; background-color: #5b9bd5; border-radius: 15px; border: 1px solid #333; margin-bottom: 20px; }
.chart-box { width: 80px; height: 80px; background: white; border: 1px solid #333; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.pie-chart { width: 60px; height: 60px; border-radius: 50%; border: 1px solid black; }
.skill-level-text { font-weight: bold; font-size: 16px; }
.footer-table { display: flex; height: 60px; }
.note-col { width: 50%; border-right: 2px solid #000; display: flex; align-items: center; padding-left: 10px; font-weight: bold; font-size: 14px; }
.review-col { width: 50%; display: flex; flex-direction: column; }
.review-header, .review-body { display: flex; height: 50%; }
.review-header { border-bottom: 1px solid #000; }
.r-cell { width: 50%; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
.r-cell:last-child { border-right: none; }
`;

const update = async () => {
    try {
        console.log("Updating default certificate template header and styles...");
        const [result] = await pool.query("UPDATE certificate_templates SET template = ?, styles = ? WHERE isDefault = 1", [newTemplate, newStyles]);

        if (result.affectedRows === 0) {
            console.log("No default template found. Updating first active template...");
            const [rows] = await pool.query("SELECT id FROM certificate_templates WHERE isActive = 1 LIMIT 1");
            if (rows.length > 0) {
                await pool.query("UPDATE certificate_templates SET template = ?, styles = ? WHERE id = ?", [newTemplate, newStyles, rows[0].id]);
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
