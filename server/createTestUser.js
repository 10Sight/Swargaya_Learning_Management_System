import { config } from "dotenv";
import mongoose from "mongoose";
import User from "./models/auth.model.js";

// Load environment variables
config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Create test admin user
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: "admin@test.com" },
        { userName: "admin" }
      ]
    });

    if (!existingAdmin) {
      const testAdmin = await User.create({
        fullName: "Test Admin",
        userName: "admin",
        email: "admin@test.com",
        phoneNumber: "+1234567890",
        password: "admin123",
        role: "ADMIN",
        status: "ACTIVE",
        isVerified: true
      });
      console.log("✅ Test admin user created!");
      console.log("📧 Email: admin@test.com");
      console.log("👤 Username: admin");
      console.log("🔑 Password: admin123");
    } else {
      console.log("✅ Test admin user already exists!");
      console.log("📧 Email: admin@test.com");
      console.log("👤 Username: admin");  
      console.log("🔑 Password: admin123");
    }

    // Create test student user
    const existingStudent = await User.findOne({ 
      $or: [
        { email: "student@test.com" },
        { userName: "student" }
      ]
    });

    if (!existingStudent) {
      const testStudent = await User.create({
        fullName: "Test Student",
        userName: "student",
        email: "student@test.com", 
        phoneNumber: "+1234567891",
        password: "student123",
        role: "STUDENT",
        status: "ACTIVE",
        isVerified: true
      });
      console.log("\n✅ Test student user created!");
      console.log("📧 Email: student@test.com");
      console.log("👤 Username: student");
      console.log("🔑 Password: student123");
    } else {
      console.log("\n✅ Test student user already exists!");
      console.log("📧 Email: student@test.com");
      console.log("👤 Username: student");
      console.log("🔑 Password: student123");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n📴 Database connection closed");
    process.exit(0);
  }
};

createTestUsers();
