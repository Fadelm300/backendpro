import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRoutes from "../routes/contact.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://fadelprofile.vercel.app",
  "https://fadelprofile-4ea15uteq-fadel-s-projects.vercel.app",
  "http://localhost:5174"  
];

// إعداد CORS لكل الطلبات
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  })
);

// السماح بـ preflight لكل المسارات
app.options("/api/contact", cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(express.json());
app.use("/api/contact", contactRoutes);

app.get("/", (req, res) => {
  res.send("BackendPro is running on Vercel!");
});

export default app;
