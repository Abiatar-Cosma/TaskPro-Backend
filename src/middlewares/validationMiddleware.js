const { check, validationResult } = require("express-validator");

/**
 * Middleware generic care rulează un set de validări și întoarce erorile în format consistent.
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
 * Normalizează body-ul cererii pentru carduri/coloane/board:
 *  - Acceptă aliasuri:
 *      * columnId / column_id / colId  -> column
 *      * deadline -> dueDate (ISO)
 *  - Normalizează priority:
 *      * "without priority" / "none" / "without" -> elimină (va folosi defaultul din backend = "low")
 *      * "low" | "medium" | "high" -> lowercase curat
 */
const normalizeCardBody = (req, _res, next) => {
  const b = req.body || {};

  // === column aliases -> column
  const colAlias = b.column ?? b.columnId ?? b.column_id ?? b.colId ?? null;

  if (colAlias) {
    req.body.column = String(colAlias).trim();
  }

  // === deadline -> dueDate (ISO dacă e valid)
  if (b.deadline && !b.dueDate) {
    const d = new Date(b.deadline);
    req.body.dueDate = Number.isNaN(d.getTime()) ? b.deadline : d.toISOString();
  }
  if ("deadline" in req.body) delete req.body.deadline;

  // === priority sanitize/normalize
  if (typeof b.priority !== "undefined") {
    const p = String(b.priority || "")
      .trim()
      .toLowerCase();
    if (["low", "medium", "high"].includes(p)) {
      req.body.priority = p;
    } else if (["none", "without", "without priority", ""].includes(p)) {
      // scoatem complet -> cade pe default în controller/model
      delete req.body.priority;
    } else {
      // lăsăm validatorul să raporteze dacă vine altceva exotic
      req.body.priority = p;
    }
  }

  next();
};

const validations = {
  /* ---------------- Boards ---------------- */
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

  /* ---------------- Columns ---------------- */
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

  /* ---------------- Cards ---------------- */
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

    // Acceptăm doar câmpul final "column" (aliasurile sunt rezolvate în normalizeCardBody)
    check("column")
      .notEmpty()
      .withMessage("Column ID is required")
      .isMongoId()
      .withMessage("Invalid column ID format"),

    // Priority: sanitizăm și validăm robust (după normalizeCardBody încă o dată)
    check("priority")
      .optional({ nullable: true })
      .customSanitizer((v) =>
        String(v || "")
          .trim()
          .toLowerCase()
      )
      .custom((v) => {
        // dacă lipsește după normalize, e ok -> controller pune default
        if (!v) return true;
        // doar low/medium/high permise explicit
        if (["low", "medium", "high"].includes(v)) return true;
        // „none/without” NU mai intră aici (normalizeCardBody le șterge)
        throw new Error("Priority must be low, medium, or high");
      }),

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
      .optional({ nullable: true })
      .customSanitizer((v) =>
        String(v || "")
          .trim()
          .toLowerCase()
      )
      .custom((v) => {
        if (!v) return true;
        if (["low", "medium", "high"].includes(v)) return true;
        throw new Error("Priority must be low, medium, or high");
      }),
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

  /* ---------------- Auth / Users ---------------- */
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
