/**
 * app.js — Express app
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const dotenv = require("dotenv");

// ---------- ENV LOADING (per environment) ----------
const envName = process.env.NODE_ENV || "development";
const envPath = path.resolve(process.cwd(), `.env.${envName}`);
dotenv.config({ path: envPath }); // load .env.development / .env.production first
dotenv.config(); // then load plain .env as fallback

// ---------- CONFIG VALIDATION ----------
const { validateAppConfig } = require("./utils/validateConfig");
try {
  validateAppConfig();
} catch (err) {
  // Fail fast if critical configuration is missing
  console.error(`Application startup failed: ${err.message}`);
  process.exit(1);
}

// ---------- ROUTES ----------
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const boardRoutes = require("./routes/boardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const cardRoutes = require("./routes/cardRoutes");
const needHelpRoutes = require("./routes/needHelpRoutes");

// ---------- SWAGGER ----------
const setupSwagger = require("./docs/swagger");

// ---------- ERROR MIDDLEWARE ----------
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

// ---------- APP ----------
const app = express();

// If app is behind a proxy (Render/Heroku/NGINX), this is required for Secure cookies
app.set("trust proxy", 1);

// ---------- SECURITY HEADERS ----------
app.use(
  helmet({
    // allow images/fonts/scripts requested cross-origin (GitHub Pages → your API)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ---------- CORS (BEFORE ROUTES!) ----------
const parseCsv = (v) =>
  (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Build allowed origins list (NO backend URL here)
const allowedOrigins = Array.from(
  new Set(
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL, // e.g. https://abiatar-cosma.github.io
      ...parseCsv(process.env.CORS_ORIGINS), // e.g. https://abiatar-cosma.github.io,http://localhost:3000
    ].filter(Boolean)
  )
);

const corsOptions = {
  origin(origin, cb) {
    // Allow tools without Origin (curl/Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true, // set true only if you use cookies; harmless otherwise
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // cache preflight 24h
};

app.use(cors(corsOptions));
// Make sure every preflight gets a proper CORS response
app.options("*", cors(corsOptions));

// ---------- LOGGING ----------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ---------- BODY PARSERS (BEFORE ROUTES) ----------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------- STATIC ----------
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ---------- SWAGGER UI ----------
setupSwagger(app);

// ---------- HEALTHCHECK ----------
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// ---------- ROOT ----------
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Task Pro API",
    version: "1.0.0",
    documentation: "/api-docs",
  });
});

// ---------- API ROUTES ----------
app.use("/api/need-help", needHelpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/cards", cardRoutes);

// ---------- 404 + ERROR HANDLERS ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
