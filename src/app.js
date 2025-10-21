/**
 * app.js — Express app
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require('path');           
const dotenv = require('dotenv');

// 1) Alege fișierul în funcție de NODE_ENV (development / production)
const envName = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env.${envName}`);

// 2) Încarcă întâi env specific mediului (dacă există)
dotenv.config({ path: envPath });

// 3) Apoi încarcă și .env ca fallback (valori comune/locale)
dotenv.config();

// Validate application configuration
const { validateAppConfig } = require("./utils/validateConfig");
try {
  validateAppConfig();
} catch (error) {
  console.error(`Application startup failed: ${error.message}`);
  process.exit(1);
}

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const boardRoutes = require("./routes/boardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const cardRoutes = require("./routes/cardRoutes");
const needHelpRoutes = require("./routes/needHelpRoutes");

// Swagger
const setupSwagger = require("./docs/swagger");

// Middlewares
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

// Create app
const app = express();

// ✅ Dacă rulezi în spatele unui proxy (Render/NGINX/Heroku), e necesar pentru cookie-uri Secure
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// ===== CORS configurabil din .env =====
// Acceptă listă separată prin virgulă în CORS_ORIGINS, ex:
// CORS_ORIGINS=https://abiatar-cosma.github.io,http://localhost:3000
const parseCsv = (v) =>
  (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const envOrigins = parseCsv(process.env.CORS_ORIGINS);

// fallback-uri prietenoase, plus cele din .env
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL, // ex: https://abiatar-cosma.github.io
  process.env.SERVER_URL, // ex: https://task-pro-backend-xxxx.onrender.com
  ...envOrigins,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Permit „no origin” (ex: curl/Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400, // cache preflight 24h
  })
);

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parsers — trebuie puse înaintea rutelor
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger UI
setupSwagger(app);

// Healthcheck (pentru PaaS)
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Task Pro API",
    version: "1.0.0",
    documentation: "/api-docs", // ✅ uniform cu setupSwagger
  });
});

// API routes
app.use("/api/need-help", needHelpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/cards", cardRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
