import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import bodyParser from "body-parser";
import router from "./routes/router.js";
import blogrout from "./routes/blogrout.js";
import userrout from "./routes/userrout.js";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// CORS
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.use("/api/v1/auth", router);
app.use("/api/v1/blog", blogrout);
app.use("/api/v1/user", userrout);

// DB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.log("Connection failed:", err);
  }
};

// Start Server
connectDB().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
});
