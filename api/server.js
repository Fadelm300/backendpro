import Brevo from "@getbrevo/brevo";
import dotenv from "dotenv";

dotenv.config();

const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export default async function handler(req, res) {
  // --- CORS headers ---
  const allowedOrigins = [
    "https://fadelprofile.vercel.app",
    "https://fadelprofile-869gzgzkl-fadel-s-projects.vercel.app",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176"
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*"); // لتجارب Postman
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // --- Preflight request ---
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }

  try {
    const sendSmtpEmail = {
      sender: { email: process.env.SENDER_EMAIL, name: "Portfolio Contact Form" },
      to: [{ email: process.env.RECEIVER_EMAIL, name: "Fadel" }],
      subject: `New Contact Message from ${name}`,
      htmlContent: `
        <h2>New Message from Portfolio Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong>: ${phone || "N/A"}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };
    await client.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Brevo Error:", error);
    res.status(500).json({ error: error.message || "Failed to send message" });
  }
}
