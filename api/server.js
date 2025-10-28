import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRouter from "../routes/contact.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman أو server-to-server
    if (origin.startsWith("http://localhost")) return callback(null, true);
    if (origin === "https://fadelprofile.vercel.app") return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204 // مهم للـ preflight request
}));

app.use(express.json());

// Routes
app.use("/api/contact", contactRouter);

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend on Vercel is alive ✅" });
});

export default app;
