import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRoutes from "./routes/contact.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://fadelprofile.vercel.app",
  "https://fadelprofile-eziq9pw2p-fadel-s-projects.vercel.app" 
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
  res.send("BackendPro is running!");
});

app.listen(PORT, () => {
  // console.log(`Server is running on http://localhost:${PORT}`);
});
