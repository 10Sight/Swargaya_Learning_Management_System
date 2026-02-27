import { pool } from "../db/connectDB.js";
import Course from "../models/course.model.js";

const smokeTestHindi = async () => {
    try {
        console.log("Starting Smoke Test: Hindi Character Support...");

        const hindiTitle = "हिन्दी कोर्स (Hindi Course Test)";
        const hindiDesc = "यह एक परीक्षण विवरण है। (This is a test description.)";

        console.log(`Attempting to create a course with title: "${hindiTitle}"`);

        // Create a test course
        // Note: Using the model's create method
        const course = await Course.create({
            title: hindiTitle,
            description: hindiDesc,
            category: "Test",
            instructor: "Test Instructor",
            createdBy: "SmokeTest"
        });

        console.log(`Course created with ID: ${course.id}`);
        console.log(`Retrieved Title: "${course.title}"`);

        if (course.title === hindiTitle) {
            console.log("SUCCESS: Hindi characters stored and retrieved correctly!");
        } else {
            console.error("FAILURE: Character encoding issue persists.");
            console.error(`Expected: ${hindiTitle}`);
            console.error(`Received: ${course.title}`);
        }

        // Cleanup
        console.log("Cleaning up test data...");
        await pool.query("DELETE FROM courses WHERE id = ?", [course.id]);

        process.exit(course.title === hindiTitle ? 0 : 1);
    } catch (error) {
        console.error("Smoke test failed with error:", error);
        process.exit(1);
    }
};

smokeTestHindi();
