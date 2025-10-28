import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRoutes from "../routes/contact.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://fadelprofile.vercel.app",
  "https://fadelprofile-kvjiuqpep-fadel-s-projects.vercel.app", 
  "http://localhost:5173", 
  "https://backendpro-itjlkq7au-fadel-s-projects.vercel.app"
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
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/contact", contactRoutes);

app.get("/", (req, res) => {
  res.send("BackendPro is running on Vercel!");
});

// ✅ نصدّر السيرفر بدل app.listen
export default app;
