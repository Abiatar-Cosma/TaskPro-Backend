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
 * - acceptă `deadline` ca alias pentru `dueDate` (în ISO)
 * - normalizează `priority` la: low/medium/high; valori precum `none`/`without priority` sunt scoase
 * - acceptă alias-uri pentru column: `columnId`, `column_id`, `colId`
 */
const normalizeCardBody = (req, _res, next) => {
  const b = req.body || {};

  // ---- column aliases -> column
  const aliasColumn =
    b.column || b.columnId || b.column_id || b.colId || undefined;
  if (aliasColumn) req.body.column = aliasColumn;
  // curățăm alias-urile ca să nu mai ajungă la validare
  delete req.body.columnId;
  delete req.body.column_id;
  delete req.body.colId;

  // ---- deadline -> dueDate (dacă dueDate nu e deja setat)
  if (b.deadline && !b.dueDate) {
    try {
      const iso = new Date(b.deadline).toISOString();
      req.body.dueDate = iso;
    } catch {
      req.body.dueDate = b.deadline; // lăsăm validarea să prindă formatul invalid
    }
  }
  if ("deadline" in req.body) delete req.body.deadline;

  // ---- normalize priority (low/medium/high) sau elimină
  if (typeof b.priority !== "undefined") {
    const p = String(b.priority || "")
      .trim()
      .toLowerCase();
    if (["low", "medium", "high"].includes(p)) {
      req.body.priority = p;
    } else if (["without", "without priority", "none", ""].includes(p)) {
      delete req.body.priority; // va aplica default în controller
    } else {
      // lăsăm validarea să arate eroarea
      req.body.priority = p;
    }
  }

  next();
};

const validations = {
  // -------- Boards ----------
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

  // -------- Columns ----------
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

  // -------- Cards ----------
  // !!! Sanitizăm priority aici ca să nu mai existe reject eronat
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
      .isString()
      .withMessage("Priority must be a string")
      .trim()
      .toLowerCase()
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
      .isString()
      .withMessage("Priority must be a string")
      .trim()
      .toLowerCase()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    check("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ],

  // -------- Move / Reorder ----------
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

  // -------- Auth ----------
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
};

module.exports = {
  validations,
  validate,
  normalizeCardBody,
};
