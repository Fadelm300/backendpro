import Brevo from "@getbrevo/brevo";
import dotenv from "dotenv";
import validator from "validator";

dotenv.config();

const EMAIL_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_LIMIT = 3;
const MAX_BODY_BYTES = 10_000;
const requestCounts = new Map();

const allowedOrigins = new Set([
  "https://fadelprofile.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
]);

const previewOriginPattern =
  /^https:\/\/fadelprofile-[a-z0-9-]+-fadel-s-projects\.vercel\.app$/i;

const urlPattern =
  /\b(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|io|app|dev|xyz|info|biz|me|co)(?:\/|\b))/iu;

const isAllowedOrigin = (origin) =>
  allowedOrigins.has(origin) || previewOriginPattern.test(origin);

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return String(forwarded || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
};

const isRateLimited = (ip) => {
  const now = Date.now();
  const current = requestCounts.get(ip);

  if (!current || now >= current.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + EMAIL_WINDOW_MS });
    return false;
  }

  if (current.count >= EMAIL_LIMIT) return true;

  current.count += 1;
  return false;
};

const escapeHtml = (value) => validator.escape(value);

const escapeMultilineHtml = (value) =>
  escapeHtml(value).replace(/\r?\n/g, "<br>");

const cleanHeader = (value) =>
  value.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").trim();

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST" && req.method !== "OPTIONS") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const origin = req.headers.origin || "";

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Origin not allowed." });
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();

  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (!contentType.startsWith("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json." });
  }

  const declaredLength = Number(req.headers["content-length"] || 0);

  if (declaredLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request is too large." });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request is too large." });
  }

  const allowedFields = new Set(["name", "email", "phone", "message", "website"]);

  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    return res.status(400).json({ error: "Unexpected form field." });
  }

  const {
    name,
    email,
    phone = "",
    message,
    website = "",
  } = body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    typeof message !== "string" ||
    typeof website !== "string"
  ) {
    return res.status(400).json({ error: "Invalid field type." });
  }

  if (website.trim()) {
    return res.status(200).json({
      message: "Your message has been sent successfully!",
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanPhone = phone.trim();
  const cleanMessage = message.trim();

  if (cleanName.length < 2 || cleanName.length > 80) {
    return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
  }

  if (!/^[\p{L}\p{M}][\p{L}\p{M}\p{N} .,'’\-]{1,79}$/u.test(cleanName)) {
    return res.status(400).json({ error: "Name contains invalid characters." });
  }

  if (
    cleanEmail.length > 254 ||
    !validator.isEmail(cleanEmail, { allow_utf8_local_part: false })
  ) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  if (
    cleanPhone &&
    (cleanPhone.length < 5 ||
      cleanPhone.length > 25 ||
      !/^[+\d\s().-]+$/.test(cleanPhone))
  ) {
    return res.status(400).json({ error: "Invalid phone number." });
  }

  if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
    return res.status(400).json({
      error: "Message must be between 10 and 2000 characters.",
    });
  }

  if (urlPattern.test(cleanMessage)) {
    return res.status(400).json({
      error: "Links are not allowed in messages.",
    });
  }

  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Too many messages. Please try again later.",
    });
  }

  const requiredEnvironmentVariables = [
    "BREVO_API_KEY",
    "SENDER_EMAIL",
    "RECEIVER_EMAIL",
  ];

  if (requiredEnvironmentVariables.some((key) => !process.env[key])) {
    console.error("Email service configuration is incomplete.");
    return res.status(500).json({ error: "Unable to send message." });
  }

  const client = new Brevo.TransactionalEmailsApi();

  client.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );

  const safeName = escapeHtml(cleanName);
  const safeEmail = escapeHtml(cleanEmail);
  const safePhone = cleanPhone ? escapeHtml(cleanPhone) : "Not provided";
  const safeMessage = escapeMultilineHtml(cleanMessage);
  const subjectName = cleanHeader(cleanName);

  try {
    await client.sendTransacEmail({
      sender: {
        email: process.env.SENDER_EMAIL,
        name: "Portfolio Contact Form",
      },
      to: [{ email: process.env.RECEIVER_EMAIL, name: "Fadel" }],
      replyTo: { email: cleanEmail, name: subjectName },
      subject: `New Contact Message from ${subjectName}`,
      textContent: [
        "New message from the portfolio contact form",
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Phone: ${cleanPhone || "Not provided"}`,
        "",
        cleanMessage,
      ].join("\n"),
      htmlContent: `
        <h2>New Message from Portfolio Contact Form</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return res.status(200).json({
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error("Brevo email delivery failed:", error?.message || "Unknown error");
    return res.status(500).json({ error: "Unable to send message." });
  }
}
