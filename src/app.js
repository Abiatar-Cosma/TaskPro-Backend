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

// Dacă aplicația e în spatele unui proxy (Render/Heroku/NGINX) e necesar pentru cookie-uri Secure
app.set("trust proxy", 1);

// ---------- SECURITY HEADERS ----------
app.use(
  helmet({
    // permite încărcarea cross-origin a imaginilor/fonturilor/scripturilor (GitHub Pages → API)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ---------- CORS (ÎNAINTE DE RUTE!) ----------
const parseCsv = (v) =>
  (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// NU pune URL-ul backend-ului aici.
// Adaugă în Render: FRONTEND_URL=https://abiatar-cosma.github.io
// sau CORS_ORIGINS= https://abiatar-cosma.github.io, http://localhost:3000, ...
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

// dacă nu folosești cookie-uri cross-site, poți seta credentials:false în loc de true
const corsOptions = {
  origin(origin, cb) {
    // permită tool-urile fără header Origin (curl/Postman/healthz)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true, // pune true doar dacă ai cookies; altfel folosește false
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // cache preflight 24h
};

app.use(cors(corsOptions));
// preflight global
app.options("*", cors(corsOptions));

// (opțional) vezi în log-uri originile acceptate
console.log("CORS allowedOrigins:", allowedOrigins);

// ---------- LOGGING ----------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ---------- BODY PARSERS (ÎNAINTE DE RUTE) ----------
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
