import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";
import donorRoutes from "./routes/donor.routes.js";
import campRoutes from "./routes/camp.routes.js";
import requestRoutes from "./routes/request.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/camps", campRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statsRoutes);

// Serve the frontend (backend/public) from the same server.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`API on :${PORT}`)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
