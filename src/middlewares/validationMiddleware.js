const { check, validationResult } = require("express-validator");

/**
 * Middleware pentru procesarea rezultatelor validării
 * @param {Array} validations - Array de reguli de validare
 * @returns {Array} - Middleware-uri pentru validare și procesare rezultate
 */
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
 * Normalizează body-ul cardului:
 * - acceptă alias-uri pentru column: columnId / column_id / colId -> column
 * - acceptă `deadline` ca alias pentru `dueDate` (transformă în ISO dacă se poate)
 * - normalizează `priority` la: low/medium/high (valori ca 'none', 'without' devin low)
 * - face trim pe title/description
 */
const normalizeCardBody = (req, _res, next) => {
  const b = req.body || {};
  const out = { ...b };

  // --- alias pentru column ---
  out.column = out.column || out.columnId || out.column_id || out.colId;
  delete out.columnId;
  delete out.column_id;
  delete out.colId;

  // --- title/description: trim ---
  if (typeof out.title === "string") out.title = out.title.trim();
  if (typeof out.description === "string")
    out.description = out.description.trim();

  // --- deadline -> dueDate (dacă dueDate nu e deja setat) ---
  if (out.deadline && !out.dueDate) {
    try {
      const d = new Date(out.deadline);
      if (!Number.isNaN(d.getTime())) {
        out.dueDate = d.toISOString();
      } else {
        out.dueDate = out.deadline; // lasă validatorul să raporteze format invalid
      }
    } catch {
      out.dueDate = out.deadline;
    }
  }
  if ("deadline" in out) delete out.deadline;

  // --- dueDate gol -> elimină (ca să treacă validatorul optional) ---
  if (out.dueDate === "") delete out.dueDate;

  // --- priority: normalizează aliasuri comune ---
  if (typeof out.priority !== "undefined") {
    const p = String(out.priority || "")
      .toLowerCase()
      .trim();
    const map = { "without priority": "low", without: "low", none: "low" };
    const normalized = map[p] || p;
    if (["low", "medium", "high"].includes(normalized)) {
      out.priority = normalized;
    } else {
      // dacă vine ceva nevalid, scoatem câmpul (validatorul e optional)
      delete out.priority;
    }
  }

  req.body = out;
  next();
};

const validations = {
  // Board validations
  validateBoardCreate: [
    check("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
    check("icon").optional().isString().withMessage("Icon must be a string"),
    check("background")
      .optional()
      .isString()
      .withMessage("Background must be a string"),
  ],

  validateBoardUpdate: [
    check("title")
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
    check("icon").optional().isString().withMessage("Icon must be a string"),
    check("background")
      .optional()
      .isString()
      .withMessage("Background must be a string"),
  ],

  // Column validations
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

  // Card validations
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

  // Authentication validations
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

module.exports = {
  validations,
  validate,
  normalizeCardBody,
};
