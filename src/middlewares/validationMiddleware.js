// src/middlewares/validationMiddleware.js
const { validationResult, check } = require("express-validator");

const validate = (rules) => {
  const list = Array.isArray(rules) ? rules : rules ? [rules] : [];
  return [
    ...list,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors
            .array()
            .map((e) => ({ field: e.path, message: e.msg })),
        });
      }
      next();
    },
  ];
};

/**
 * Normalizează body-ul cardului:
 * - acceptă `columnId` / `column_id` / `colId` ca alias pentru `column`
 * - acceptă `deadline` ca alias pentru `dueDate`
 * - normalizează `priority` doar la nivel de string (NU validăm aici)
 */
const normalizeCardBody = (req, _res, next) => {
  const b = req.body || {};

  // columnId alias → column
  const colAlias =
    b.column ?? b.columnId ?? b.column_id ?? b.colId ?? b.col_id ?? undefined;
  if (colAlias) req.body.column = String(colAlias).trim();

  // deadline -> dueDate (doar dacă dueDate nu e deja setat)
  if (b.deadline && !b.dueDate) {
    try {
      req.body.dueDate = new Date(b.deadline).toISOString();
    } catch {
      req.body.dueDate = b.deadline;
    }
  }
  if ("deadline" in req.body) delete req.body.deadline;

  // curățăm dueDate de stringuri goale
  if (typeof req.body.dueDate !== "undefined" && req.body.dueDate === "") {
    req.body.dueDate = null;
  }

  // doar sanităm textual priority (fără rules aici)
  if (typeof b.priority !== "undefined") {
    req.body.priority =
      typeof b.priority === "string"
        ? b.priority.trim().toLowerCase()
        : b.priority;
  }

  next();
};

const validations = {
  // ------ Cards ------
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
      .bail()
      .isMongoId()
      .withMessage("Invalid column ID format"),

    // 🔥 priority scos din validator aici
    check("dueDate")
      .optional({ nullable: true })
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

    // 🔥 priority scos și de aici
    check("dueDate")
      .optional({ nullable: true })
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

  // ------ Boards ------
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

  // ------ Columns ------
  validateColumnCreate: [
    check("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Title must be between 3 and 50 characters"),
    // board poate fi trimis ca "board" (corect) — dacă ai folosit "boardId" pe frontend,
    // fă mapare ca la cards (opțional)
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

  // ------ Auth ------
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
