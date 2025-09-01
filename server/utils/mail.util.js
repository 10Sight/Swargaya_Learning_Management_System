import nodemailer from "nodemailer";
import ENV from "../configs/env.config.js";

const sendMail = async function (email, subject, message, type) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: ENV.SMTP_USERNAME,
            pass: ENV.SMTP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: "10Sight Technologies <noreply@10sight.tech.in>",
        to: email,
        subject: subject,
        html: message,
    });
};

export default sendMail;