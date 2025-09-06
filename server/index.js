import express from "express";
import cors from "cors";
import ENV from "./configs/env.config.js";
import logger from "./logger/winston.logger.js";
import authRoutes from "./routes/auth.route.js";
import connectDB from "./db/connectDB.js";
import morgan from "morgan";
import morganMiddleware from "./logger/morgan.logger.js";

const app = express();
app.use(express.json());

app.use(morgan('dev'));

const PORT = ENV.PORT;

app.get("/", (req, res) => {
    res.send("This is Backend");
});

app.use("/api/v1/auth/", authRoutes);
app.use(morganMiddleware);

app.listen(3000, async () => {
    await connectDB();
    logger.info(`http://localhost:${PORT}`);
});