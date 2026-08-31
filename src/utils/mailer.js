import nodemailer from "nodemailer";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendEmail({ to, subject, text }) {
  if (!transporter) return console.log(`[email:dev] ${to} — ${subject}`);
  await transporter.sendMail({ from: "BloodLink <no-reply@bloodlink.app>", to, subject, text });
}
