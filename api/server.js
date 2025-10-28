import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRouter from "../routes/contact.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    "https://fadelprofile.vercel.app", // رابط الفرونت بعد النشر
    "http://localhost:5175"             // للتجربة محليًا
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/contact", contactRouter);

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend on Vercel is alive ✅" });
});

export default app;
