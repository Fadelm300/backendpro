import Brevo from "@getbrevo/brevo";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import validator from "validator";

dotenv.config();

const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// --- Simple in-memory rate limiter (works even in serverless) ---
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 دقيقة
const RATE_LIMIT_MAX = 3; // أقصى 3 رسائل بالدقيقة لكل IP

export default async function handler(req, res) {
  const allowedOrigins = [
    "https://fadelprofile.vercel.app",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // --- Rate limiting ---
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();
  if (!requestCounts[ip]) requestCounts[ip] = [];
  requestCounts[ip] = requestCounts[ip].filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (requestCounts[ip].length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  requestCounts[ip].push(now);

  // --- Validation ---
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: "Message too long (max 1000 characters)." });
  }

  // Sanitize inputs (remove potential HTML/scripts)
  const clean = (str) => validator.escape(str.trim());
  const cleanName = clean(name);
  const cleanEmail = clean(email);
  const cleanPhone = phone ? clean(phone) : "N/A";
  const cleanMsg = clean(message);

  try {
    const sendSmtpEmail = {
      sender: { email: process.env.SENDER_EMAIL, name: "Portfolio Contact Form" },
      to: [{ email: process.env.RECEIVER_EMAIL, name: "Fadel" }],
      subject: `New Contact Message from ${cleanName}`,
      htmlContent: `
        <h2>New Message from Portfolio Contact Form</h2>
        <p><strong>Name:</strong> ${cleanName}</p>
        <p><strong>Email:</strong> ${cleanEmail}</p>
        <p><strong>Phone:</strong> ${cleanPhone}</p>
        <p><strong>Message:</strong></p>
        <p>${cleanMsg}</p>
      `,
    };

    await client.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Brevo Error:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
}
