// src/middlewares/validationMiddleware.js
const { check, validationResult } = require("express-validator");

/**
 * Middleware pentru procesarea rezultatelor validării
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
 * - acceptă `columnId` / `column_id` / `colId` ca alias pentru `column`
 * - acceptă `deadline` ca alias pentru `dueDate`
 * - normalizează `priority`: trim + lower; "without priority"/"none" => eliminat (lasă default)
 */
const normalizeCardBody = (req, _res, next) => {
  const b = req.body || {};

  // columnId alias → column
  const colAlias =
    b.column ?? b.columnId ?? b.column_id ?? b.colId ?? b.col_id ?? undefined;
  if (colAlias) {
    req.body.column = String(colAlias).trim();
  }

  // deadline -> dueDate (doar dacă dueDate nu e deja setat)
  if (b.deadline && !b.dueDate) {
    try {
      const iso = new Date(b.deadline).toISOString();
      req.body.dueDate = iso;
    } catch {
      req.body.dueDate = b.deadline; // lăsăm validatorul să o respingă dacă e invalid
    }
  }
  if ("deadline" in req.body) delete req.body.deadline;

  // normalize priority (low/medium/high) sau elimină dacă e "without"/"none"
  if (typeof b.priority !== "undefined") {
    const p = String(b.priority).trim().toLowerCase();
    if (["without", "without priority", "none"].includes(p)) {
      delete req.body.priority; // => default în controller/model
    } else if (["low", "medium", "high"].includes(p)) {
      req.body.priority = p;
    } else {
      // lăsăm așa cum e ca să pice la validator cu mesaj clar
      req.body.priority = String(b.priority).trim();
    }
  }

  // curățăm dueDate de stringuri goale
  if (typeof req.body.dueDate !== "undefined" && req.body.dueDate === "") {
    req.body.dueDate = null;
  }

  next();
};

const validations = {
  // ------ Card validations ------
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

    // acceptăm aliasuri dar în final "column" trebuie să fie prezent
    check("column")
      .notEmpty()
      .withMessage("Column ID is required")
      .bail()
      .isMongoId()
      .withMessage("Invalid column ID format"),

    // aici facem tolerant: string, trim, lower, apoi in(...)
    check("priority")
      .optional({ nullable: true })
      .isString()
      .withMessage("Priority must be a string")
      .trim()
      .toLowerCase()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),

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

    check("priority")
      .optional({ nullable: true })
      .isString()
      .withMessage("Priority must be a string")
      .trim()
      .toLowerCase()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),

    check("dueDate")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ],

  // (restul validărilor rămân la fel)
};

module.exports = {
  validations,
  validate,
  normalizeCardBody,
};
