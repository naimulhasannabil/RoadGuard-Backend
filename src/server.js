import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import voteRoutes from "./routes/vote.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import sosRoutes from "./routes/sos.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

import { errorHandler } from "./middleware/error.middleware.js";
import { setupSocketHandlers } from "./socket/socket.handlers.js";
import { startAlertExpirationJob } from "./jobs/alert-expiration.job.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

const alertLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many alert reports. Please wait before reporting again.",
  },
});
app.use("/api/alerts", alertLimiter);

// Parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("combined"));
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

// Error handling
app.use(errorHandler);
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Socket.io & Jobs
setupSocketHandlers(io);
startAlertExpirationJob(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 RoadGuard server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

export { io };
