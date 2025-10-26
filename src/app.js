/**
 * app.js — Express app (CORS simplu, fără cookies)
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const dotenv = require("dotenv");

// ---------- ENV ----------
const envName = process.env.NODE_ENV || "development";
const envPath = path.resolve(process.cwd(), `.env.${envName}`);
dotenv.config({ path: envPath });
dotenv.config();

const { validateAppConfig } = require("./utils/validateConfig");
try {
  validateAppConfig();
} catch (err) {
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
const setupSwagger = require("./docs/swagger");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

// ---------- APP ----------
const app = express();
app.set("trust proxy", 1);

// ---------- SECURITY ----------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ---------- CORS (ÎNAINTE DE RUTE) ----------
const parseCsv = (v) =>
  (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(
    [
      "https://abiatar-cosma.github.io",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL,
      ...parseCsv(process.env.CORS_ORIGINS),
    ].filter(Boolean)
  )
);

const corsOptions = {
  origin: allowedOrigins, // listă simplă (fără funcție)
  credentials: false, // ⬅️ fără cookies cross-site
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // cache preflight 24h
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
console.log("CORS allowedOrigins:", allowedOrigins);

// ---------- LOGGING ----------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ---------- BODY PARSERS ----------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------- STATIC ----------
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ---------- SWAGGER ----------
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

// ---------- ERRORS ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
