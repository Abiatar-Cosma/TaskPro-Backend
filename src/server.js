/**
 * server.js — entrypoint
 */
const app = require("./app");
const connectDB = require("./config/db");
const setupWebSocket = require("./services/websocketService");
const os = require("os");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Mongo
    await connectDB();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      const yellow = "\x1b[33m%s\x1b[0m";
      const green = "\x1b[32m%s\x1b[0m";
      const cyan = "\x1b[36m%s\x1b[0m";
      const divider = "=".repeat(60);

      // Detect network IP (dev convenience)
      const networkInterfaces = os.networkInterfaces();
      const ipAddress = Object.values(networkInterfaces)
        .flat()
        .filter((details) => details.family === "IPv4" && !details.internal)
        .map((details) => details.address)[0];

      const publicBase = process.env.SERVER_URL || `http://localhost:${PORT}`;

      console.log(divider);
      console.log(
        yellow,
        `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
      console.log(
        green,
        `   Local docs:     http://localhost:${PORT}/api-docs`
      );
      if (ipAddress) {
        console.log(
          green,
          `   Network docs:   http://${ipAddress}:${PORT}/api-docs`
        );
      }
      console.log(green, `   Public base:    ${publicBase}`);
      console.log(green, `   Public docs:    ${publicBase}/api-docs`);
      console.log(cyan, "🧪 Healthcheck:    /healthz");
      console.log(divider);
    });

    // WebSocket (dacă folosești)
    setupWebSocket(server);

    // Unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error(`Unhandled rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    // ✅ Graceful shutdown (SIGTERM/SIGINT)
    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}. Closing server...`);
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });

      // Hard exit dacă ceva blochează
      setTimeout(() => {
        console.warn("Forcing shutdown...");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
