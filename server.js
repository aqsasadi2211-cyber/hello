import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== "false",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Name, email and message are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
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
    res.json({ ok: true });
  } catch (err) {
    console.error("SMTP error:", err.message);
    res.status(500).json({ ok: false, error: "Could not send message. Please try again later." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Contact form running at http://localhost:${port}`));
