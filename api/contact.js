import nodemailer from "nodemailer";
import { saveMessage, markEmailSent } from "../lib/db.js";

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Name, email and message are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // Save first so the message survives even if the email fails.
  let savedId = null;
  try {
    savedId = await saveMessage({ name, email, subject, message });
  } catch (err) {
    console.error("Database error:", err.message);
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: process.env.MAIL_TO,
      replyTo: email,
      subject: subject ? `[Contact] ${subject}` : `New contact message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><b>Name:</b> ${escape(name)}<br><b>Email:</b> ${escape(email)}</p><p>${escape(message).replace(/\n/g, "<br>")}</p>`,
    });
    await markEmailSent(savedId).catch((err) => console.error("Database error:", err.message));
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SMTP error:", err.message);
    // The message is safely stored, so the visitor doesn't need to resend it.
    if (savedId != null) return res.status(200).json({ ok: true });
    res.status(500).json({ ok: false, error: "Could not send message. Please try again later." });
  }
}
