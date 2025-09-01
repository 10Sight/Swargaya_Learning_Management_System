import { config } from "dotenv";

config();

const ENV = {
    PORT: process.env.PORT || 3000,
    MONGO_URI: process.env.MONGO_URI,

    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_ACCESS_SECRET: process.env.JWT_SECRET,
}

export default ENV;