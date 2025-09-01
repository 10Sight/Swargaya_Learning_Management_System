import express from "express";
import cors from "cors";
import ENV from "./configs/env.config.js";
import logger from "./logger/winston.logger.js";

const app = express();

const PORT = ENV.PORT;

app.get("/", (req, res) => {
    res.send("This is Backend");
});

app.listen(3000, () => {
    logger.info(`http://localhost:${PORT}`);
});