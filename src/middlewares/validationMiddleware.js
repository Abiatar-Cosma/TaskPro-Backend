// src/middlewares/validationMiddleware.js
const { check, validationResult } = require("express-validator");

/** Împachetează validările și returnează JSON prietenos */
const validate = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
          })),
        });
      }
      next();
    },
  ];
};

/**
 * Normalizează body pentru card:
 * - alias pt coloană: columnId / column_id / colId → column
 * - alias pt dată: deadline → dueDate (ISO dacă posibil)
 * - normalizează priority ('without priority'/'none' → 'low')
 * - face trim la title/description
 */
const normalizeCardBody = (req, _res, next) => {
  const b = req.body || {};
  const out = { ...b };

  // —— column aliase —— //
  out.column = out.column || out.columnId || out.column_id || out.colId;
  delete out.columnId;
  delete out.column_id;
  delete out.colId;

  // —— trim —— //
  if (typeof out.title === "string") out.title = out.title.trim();
  if (typeof out.description === "string")
    out.description = out.description.trim();

  // —— deadline → dueDate —— //
  if (out.deadline && !out.dueDate) {
    try {
      const d = new Date(out.deadline);
      out.dueDate = Number.isNaN(d.getTime()) ? out.deadline : d.toISOString();
    } catch {
      out.dueDate = out.deadline;
    }
  }
  if ("deadline" in out) delete out.deadline;
  if (out.dueDate === "") delete out.dueDate;

  // —— priority normalize —— //
  if (typeof out.priority !== "undefined") {
    const p = String(out.priority || "")
      .toLowerCase()
      .trim();
    const map = { "without priority": "low", without: "low", none: "low" };
    const normalized = map[p] || p;
    if (["low", "medium", "high"].includes(normalized)) {
      out.priority = normalized;
    } else {
      delete out.priority; // invalid → scoatem (e optional oricum)
    }
  }

  req.body = out;
  next();
};

const validations = {
  // Boards
  validateBoardCreate: [
    check("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
    check("icon").optional().isString(),
    check("background").optional().isString(),
  ],
  validateBoardUpdate: [
    check("title")
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
    check("icon").optional().isString(),
    check("background").optional().isString(),
  ],

  // Columns
  validateColumnCreate: [
    check("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
    check("board")
      .notEmpty()
      .withMessage("Board ID is required")
      .isMongoId()
      .withMessage("Invalid board ID format"),
  ],
  validateColumnUpdate: [
    check("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
  ],

  // Cards
  validateCardCreate: [
    check("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 100 })
      .withMessage("Title must be between 3 and 100 characters"),
    check("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    check("column")
      .notEmpty()
      .withMessage("Column ID is required")
      .isMongoId()
      .withMessage("Invalid column ID format"),
    check("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    check("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ],
  validateCardUpdate: [
    check("title")
      .optional()
      .isLength({ min: 3, max: 100 })
      .withMessage("Title must be between 3 and 100 characters"),
    check("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    check("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    check("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ],
  validateCardMove: [
    check("newColumnId")
      .notEmpty()
      .withMessage("New column ID is required")
      .isMongoId()
      .withMessage("Invalid column ID format"),
    check("newPosition")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Position must be a positive integer"),
  ],

  // Auth
  validateRegistration: [
    check("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 3 })
      .withMessage("Name must be at least 3 characters"),
    check("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    check("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validateLogin: [
    check("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    check("password").notEmpty().withMessage("Password is required"),
  ],
  validatePasswordReset: [
    check("token").notEmpty().withMessage("Token is required"),
    check("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validateProfileUpdate: [
    check("name")
      .optional()
      .isLength({ min: 3 })
      .withMessage("Name must be at least 3 characters"),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
  ],
  validateThemeUpdate: [
    check("theme")
      .notEmpty()
      .withMessage("Theme is required")
      .isIn(["light", "dark", "violet"])
      .withMessage("Theme must be one of: light, dark, violet"),
  ],
  validateNeedHelp: [
    check("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
    check("comment")
      .notEmpty()
      .withMessage("Comment is required")
      .isLength({ min: 5, max: 1000 })
      .withMessage("Comment must be between 5 and 1000 characters"),
  ],
};

module.exports = { validations, validate, normalizeCardBody };
