import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRoutes from "../routes/contact.js";

dotenv.config();

const app = express();

// قائمة الدومينات المسموح لها الوصول (Frontend)
const allowedOrigins = [
  "https://fadelprofile.vercel.app",
  "https://fadelprofile-4ea15uteq-fadel-s-projects.vercel.app",
  "http://localhost:5174"  
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

app.use(express.json());
app.use("/api/contact", contactRoutes);

app.get("/", (req, res) => {
  res.send("BackendPro is running on Vercel!");
});

// تصدير app ليشتغل على Vercel
export default app;
