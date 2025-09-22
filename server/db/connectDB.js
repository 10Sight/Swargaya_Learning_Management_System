import mongoose from "mongoose";
import logger from "../logger/winston.logger.js";
import ENV from "../configs/env.config.js";

const connectDB = async () => {
    try {
        await mongoose.connect(ENV.MONGO_URI);
        logger.info("MongoDB Connected");
    } catch (error) {
        logger.error("MongoDB Connection Failed", error.message);
        process.exit(1);
    }
};

export default connectDB;