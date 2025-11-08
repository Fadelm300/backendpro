import Brevo from "@getbrevo/brevo";
import dotenv from "dotenv";
import validator from "validator";

dotenv.config();

const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// --- simple in-memory rate limiter ---
const requestCounts = {};
const WINDOW_MS = 60 * 1000; // 1 دقيقة
const MAX_REQUESTS = 3; // أقصى 3 رسائل في الدقيقة لكل IP

export default async function handler(req, res) {
  // --- CORS ---
  const allowedOrigins = [
    "https://fadelprofile.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // --- rate limit ---
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();
  if (!requestCounts[ip]) requestCounts[ip] = [];
  requestCounts[ip] = requestCounts[ip].filter((t) => now - t < WINDOW_MS);
  if (requestCounts[ip].length >= MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }
  requestCounts[ip].push(now);

  // --- validate & sanitize ---
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: "Message too long (max 1000 characters)" });
  }

  const clean = (str) => validator.escape(str.trim());
  const safeName = clean(name);
  const safeEmail = clean(email);
  const safePhone = phone ? clean(phone) : "N/A";
  const safeMsg = clean(message);

  try {
    await client.sendTransacEmail({
      sender: { email: process.env.SENDER_EMAIL, name: "Portfolio Contact Form" },
      to: [{ email: process.env.RECEIVER_EMAIL, name: "Fadel" }],
      subject: `New Contact Message from ${safeName}`,
      htmlContent: `
        <h2>New Message from Portfolio Contact Form</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMsg}</p>
      `,
    });

    res.status(200).json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Brevo Error:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
}
