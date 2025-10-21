/**
 * @file cardRoutes.js
 * @description Routes for card CRUD operations within a column
 */

const express = require("express");
const {
  createCard,
  getCardsByColumnId,
  getCardById,
  updateCard,
  deleteCard,
  updateCardsOrder,
  moveCardToColumn,
} = require("../controllers/cardController");
const { protect } = require("../middlewares/authMiddleware");
const {
  validate,
  validations,
  normalizeCardBody, // ← IMPORTANT: export separat din validationMiddleware
} = require("../middlewares/validationMiddleware");
const { check } = require("express-validator");

const router = express.Router();

// All card routes require authentication
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Card management (CRUD, reorder, move)
 */

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Creează un card nou
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - column
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Nou card"
 *               column:
 *                 type: string
 *                 example: "6652abcdef34567890123456"
 *               description:
 *                 type: string
 *                 example: "Card de test"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 example: medium
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-07-01T00:00:00.000Z"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: "Alias pentru dueDate (acceptat pentru compatibilitate)"
 *                 example: "2025-07-01T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Card creat
 *       400:
 *         description: Date invalide
 *       401:
 *         description: Neautorizat
 */

console.log("[cardRoutes] middlewares:", {
  normalizeCardBody: typeof normalizeCardBody,
  validateCardCreate: typeof validations?.validateCardCreate,
  createCard: typeof createCard,
});

router.post(
  "/",
  normalizeCardBody,
  validate(validations.validateCardCreate),
  createCard
);

/**
 * @swagger
 * /api/cards/column/{columnId}:
 *   get:
 *     summary: Returnează toate cardurile pentru o coloană
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: columnId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID-ul coloanei
 *     responses:
 *       200:
 *         description: Listă carduri
 *       404:
 *         description: Coloană inexistentă
 *       401:
 *         description: Neautorizat
 */
router.get("/column/:columnId", getCardsByColumnId);

/**
 * @swagger
 * /api/cards/{id}:
 *   get:
 *     summary: Obține un card după ID
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID-ul cardului
 *     responses:
 *       200:
 *         description: Cardul a fost găsit cu succes
 *       401:
 *         description: Neautorizat
 *       404:
 *         description: Cardul nu a fost găsit
 */
router.get("/:id", getCardById);

/**
 * @swagger
 * /api/cards/{id}:
 *   put:
 *     summary: Actualizează un card (complet)
 *     description: Update title, description, priority, dueDate. Acceptă și `deadline` ca alias pentru `dueDate`.
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Update docs"
 *               description:
 *                 type: string
 *                 example: "Document API for frontend"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 example: medium
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-07-01T00:00:00.000Z"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: "Alias pentru dueDate (acceptat pentru compatibilitate)"
 *                 example: "2025-07-01T00:00:00.000Z"
 *     responses:
 *       200:
 *         description: Card updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Card not found
 */
router.put(
  "/:id",
  normalizeCardBody,
  validate(validations.validateCardUpdate),
  updateCard
);

/**
 * @swagger
 * /api/cards/{id}:
 *   patch:
 *     summary: Actualizează parțial un card
 *     description: Acceptă oricare subset din title/description/priority/dueDate (sau alias deadline).
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: "Alias pentru dueDate (acceptat pentru compatibilitate)"
 *     responses:
 *       200:
 *         description: Card updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Card not found
 */
router.patch(
  "/:id",
  normalizeCardBody,
  validate(validations.validateCardUpdate),
  updateCard
);

/**
 * @swagger
 * /api/cards/reorder:
 *   patch:
 *     summary: Update the order of cards in a column
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnId
 *               - cardOrders
 *             properties:
 *               columnId:
 *                 type: string
 *                 example: "60f1b5c5fc13ae001e000001"
 *               cardOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "60f6e8d8b54764421c7b9a90"
 *                     order:
 *                       type: integer
 *                       example: 0
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Column or card not found
 */
const validateCardsReorderLocal = [
  check("columnId")
    .notEmpty()
    .withMessage("columnId is required")
    .isMongoId()
    .withMessage("Invalid columnId"),
  check("cardOrders")
    .isArray({ min: 1 })
    .withMessage("cardOrders must be a non-empty array"),
  check("cardOrders.*.id")
    .notEmpty()
    .withMessage("Each cardOrders item must have id")
    .isMongoId()
    .withMessage("Invalid card id"),
  check("cardOrders.*.order")
    .isInt({ min: 0 })
    .withMessage("order must be a positive integer"),
];

router.patch("/reorder", validate(validateCardsReorderLocal), updateCardsOrder);

/**
 * @swagger
 * /api/cards/{id}/move:
 *   patch:
 *     summary: Move a card to another column
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID to move
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newColumnId]
 *             properties:
 *               newColumnId:
 *                 type: string
 *                 example: "60f1b5c5fc13ae001e000001"
 *               newPosition:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Card moved successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Card or column not found
 */
router.patch(
  "/:id/move",
  validate(validations.validateCardMove),
  moveCardToColumn
);

module.exports = router;
