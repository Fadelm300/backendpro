import express from "express";
import dotenv from "dotenv";
import Brevo from "@getbrevo/brevo";

dotenv.config();
const router = express.Router();

const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// ====== إضافة CORS headers ======
router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // للسماح لأي localhost أو فرونت Vercel
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Handle preflight request
router.options("/", (req, res) => {
  res.sendStatus(204);
});
// ================================

router.get("/", (req, res) => {
  res.json({ message: "Contact route is alive!" });
});

router.post("/", async (req, res) => {
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
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };
    await client.sendTransacEmail(sendSmtpEmail);
    res.json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message. Try again later." });
  }
});

export default router;
