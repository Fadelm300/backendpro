import express from "express";
import dotenv from "dotenv";
import Brevo from "@getbrevo/brevo";

dotenv.config();
const router = express.Router();
const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
router.post("/", async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }
  // console.log("📨 Contact message received:", { name, email, phone, message });
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
    // console.error("🔥 Error sending email via Brevo:", error);
    res.status(500).json({ error: "Failed to send message. Try again later." });
  }
});
export default router;
