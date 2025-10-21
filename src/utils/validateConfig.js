// src/utils/validateConfig.js

const { InternalServerError } = require("./errors");

const validateRequiredEnvVars = (config, requiredVars, serviceName) => {
  const missingVars = requiredVars.filter((varName) => !config[varName]);
  if (missingVars.length > 0) {
    throw new InternalServerError(
      `${serviceName} configuration error: Missing required environment variables: ${missingVars.join(
        ", "
      )}`
    );
  }
  return true;
};

const validateMongoConfig = () => {
  return validateRequiredEnvVars(process.env, ["MONGO_URI"], "MongoDB");
};

const validateCloudinaryConfig = () => {
  const enabled = (process.env.CLOUDINARY_ENABLED || "true") === "true";
  if (!enabled) {
    console.warn("[config] Cloudinary disabled (CLOUDINARY_ENABLED=false)");
    return true;
  }
  return validateRequiredEnvVars(
    process.env,
    ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    "Cloudinary"
  );
};

const validateAppConfig = () => {
  try {
    validateMongoConfig();
    validateCloudinaryConfig(); // acum e condițional
    console.log("✅ All configuration validations passed");
    return true;
  } catch (error) {
    console.error("❌ Configuration validation failed:", error.message);
    throw error;
  }
};

module.exports = {
  validateRequiredEnvVars,
  validateCloudinaryConfig,
  validateMongoConfig,
  validateAppConfig,
};
