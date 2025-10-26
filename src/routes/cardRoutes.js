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
  normalizeCardBody, // ← IMPORTANT: mapează columnId → column, deadline → dueDate
} = require("../middlewares/validationMiddleware");
const { check } = require("express-validator");

const router = express.Router();

// toate rutele de card necesită autentificare
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Card management (CRUD, reorder, move)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Card:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68fe0db1a1234567890abcde"
 *         title:
 *           type: string
 *           example: "Nou card"
 *         description:
 *           type: string
 *           example: "Card de test"
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           example: "medium"
 *         dueDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2025-07-01T00:00:00.000Z"
 *         column:
 *           type: string
 *           description: "ID-ul coloanei (MongoId)"
 *           example: "6652abcdef34567890123456"
 *         owner:
 *           type: string
 *           example: "6652abcdef34567890123400"
 *         order:
 *           type: integer
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Creează un card nou
 *     description: >
 *       Creează un card în interiorul unei coloane. Endpoint-ul acceptă **alias-uri**:
 *       - `columnId` (sau `column_id`/`colId`) este acceptat și mapat intern la `column`.
 *       - `deadline` este acceptat ca alias pentru `dueDate` (ISO 8601).
 *       Valorile `priority` pot fi `low`/`medium`/`high`. Valori ca `none` sau `without priority` vor fi normalizate la `low`.
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - type: object
 *                 required: [title]
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "Nou card"
 *                   description:
 *                     type: string
 *                     example: "Card de test"
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     example: "medium"
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-01T00:00:00.000Z"
 *                   deadline:
 *                     type: string
 *                     format: date-time
 *                     description: "Alias pentru dueDate (acceptat pentru compatibilitate)"
 *                     example: "2025-07-01T00:00:00.000Z"
 *               - oneOf:
 *                   - type: object
 *                     required: [column]
 *                     properties:
 *                       column:
 *                         type: string
 *                         description: "ID-ul coloanei (MongoId)"
 *                         example: "6652abcdef34567890123456"
 *                   - type: object
 *                     required: [columnId]
 *                     properties:
 *                       columnId:
 *                         type: string
 *                         description: "Alias pentru column (MongoId) — este mapat automat"
 *                         example: "6652abcdef34567890123456"
 *     responses:
 *       201:
 *         description: Card creat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Card'
 *       400:
 *         description: Date invalide
 *       401:
 *         description: Neautorizat
 */
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Card'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Card'
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
 *     description: >
 *       Update pentru title/description/priority/dueDate. Acceptă și `deadline` ca alias pentru `dueDate`.
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
 *                 example: "medium"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Card'
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
 *     description: Acceptă subset din title/description/priority/dueDate (alias deadline acceptat).
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Card'
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
