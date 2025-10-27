const Card = require("../models/Card");
const Column = require("../models/Column");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require("../utils/errors");

/* ---------------------------
 * Helpers
 * --------------------------- */
// în același fișier
const normalizePriority = (p) => {
  if (p == null || p === "") return "low";
  const s = String(p).trim().toLowerCase();
  if (["without", "without priority", "none"].includes(s)) return "low";
  if (["low", "medium", "high"].includes(s)) return s;
  // fallback gentil, nu aruncăm eroare
  return "low";
};

const normalizeDueDate = (payload) => {
  const body = { ...payload };
  // Acceptă atât "deadline" cât și "dueDate" → intern folosim dueDate
  if (body.deadline && !body.dueDate) body.dueDate = body.deadline;
  delete body.deadline;

  if (body.dueDate == null || body.dueDate === "") {
    body.dueDate = null;
  } else {
    const d = new Date(body.dueDate);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestError("Invalid date for dueDate/deadline");
    }
    body.dueDate = d;
  }

  return body;
};

/* ---------------------------
 * Create a new card in a column
 * POST /api/cards
 * --------------------------- */
exports.createCard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1) Normalizează datele de intrare
    const body = normalizeDueDate(req.body);

    const { title, description = "", column } = body;
    if (!title || !column) {
      throw new BadRequestError("Title and column are required");
    }

    // 2) Verifică existența coloanei (și, dacă ai ownership pe board/column, verifică permisiunea)
    const col = await Column.findById(column);
    if (!col) throw new NotFoundError("Column not found");

    // Dacă modelul Column NU are owner, dar Board are, înlocuiește cu:
    // const col = await Column.findById(column).populate('board');
    // if (!col) throw new NotFoundError("Column not found");
    // if (String(col.board.owner) !== String(userId)) throw new ForbiddenError("No permission");

    // Dacă modelul Column ARE owner, lasă așa:
    if (col.owner && String(col.owner) !== String(userId)) {
      throw new ForbiddenError(
        "You do not have permission to add cards to this column"
      );
    }

    // 3) Calculează order la finalul coloanei
    const countInColumn = await Card.countDocuments({ column });
    const priority = normalizePriority(body.priority);

    const card = await Card.create({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: body.dueDate, // poate fi null sau Date
      column,
      order: countInColumn, // la final
      owner: userId,
    });

    res.status(201).json({ status: "success", data: card });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------
 * Get all cards for a specific column
 * GET /api/cards/column/:columnId
 * --------------------------- */
exports.getCardsByColumnId = async (req, res, next) => {
  try {
    const { columnId } = req.params;

    const column = await Column.findById(columnId);
    if (!column) {
      throw new NotFoundError("Column not found");
    }

    if (column.owner && column.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to view cards in this column"
      );
    }

    const cards = await Card.find({ column: columnId }).sort({
      order: 1,
      createdAt: 1,
    });

    res.status(200).json({
      status: "success",
      data: cards,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------
 * Get a card by ID
 * GET /api/cards/:id
 * --------------------------- */
exports.getCardById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError("Card not found");
    }

    if (String(card.owner) !== String(req.user.id)) {
      throw new ForbiddenError("You do not have permission to view this card");
    }

    res.status(200).json({
      status: "success",
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------
 * Update a card (PUT/PATCH)
 * PUT /api/cards/:id
 * PATCH /api/cards/:id
 * --------------------------- */
exports.updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1) Normalizează payload: deadline -> dueDate, validează
    const body = normalizeDueDate(req.body);

    // 2) Găsește cardul și verifică drepturile
    const card = await Card.findById(id);
    if (!card) throw new NotFoundError("Card not found");
    if (String(card.owner) !== String(req.user.id)) {
      throw new ForbiddenError(
        "You do not have permission to update this card"
      );
    }

    // 3) Doar câmpuri permise
    const allowed = ["title", "description", "priority", "labels", "dueDate"];

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, "priority")) {
        card.priority = normalizePriority(body.priority);
      }
    }

    await card.save();

    res.status(200).json({ status: "success", data: card });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------
 * Delete a card
 * DELETE /api/cards/:id
 * --------------------------- */
exports.deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError("Card not found");
    }

    if (String(card.owner) !== String(req.user.id)) {
      throw new ForbiddenError(
        "You do not have permission to delete this card"
      );
    }

    await Card.findByIdAndDelete(id);

    // Reordonează restul cardurilor din coloană
    await Card.updateMany(
      { column: card.column, order: { $gt: card.order } },
      { $inc: { order: -1 } }
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/* ---------------------------
 * Update the order of cards in a column
 * PATCH /api/cards/reorder
 * --------------------------- */
exports.updateCardsOrder = async (req, res, next) => {
  try {
    const { columnId, cardOrders } = req.body;

    const column = await Column.findById(columnId);
    if (!column) {
      throw new NotFoundError("Column not found");
    }

    if (column.owner && String(column.owner) !== String(req.user.id)) {
      throw new ForbiddenError(
        "You do not have permission to reorder cards in this column"
      );
    }

    if (!Array.isArray(cardOrders)) {
      throw new BadRequestError("cardOrders must be an array");
    }

    const updatePromises = cardOrders.map(({ id, order }) =>
      Card.findOneAndUpdate(
        { _id: id, column: columnId },
        { order },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    const updatedCards = await Card.find({ column: columnId }).sort({
      order: 1,
    });

    res.status(200).json({
      status: "success",
      data: updatedCards,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------
 * Move a card to another column
 * PATCH /api/cards/:id/move
 * --------------------------- */
exports.moveCardToColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newColumnId, newPosition = 0 } = req.body;

    const card = await Card.findById(id);
    if (!card) throw new NotFoundError("Card not found");
    if (String(card.owner) !== String(req.user.id)) {
      throw new ForbiddenError("You do not have permission to move this card");
    }

    const destinationColumn = await Column.findById(newColumnId);
    if (!destinationColumn) {
      throw new NotFoundError("Destination column not found");
    }

    if (
      destinationColumn.owner &&
      String(destinationColumn.owner) !== String(req.user.id)
    ) {
      throw new ForbiddenError(
        "You do not have permission to add cards to this column"
      );
    }

    const sourceColumnId = card.column;

    // 1) Scoate din coloana veche
    await Card.updateMany(
      { column: sourceColumnId, order: { $gt: card.order } },
      { $inc: { order: -1 } }
    );

    // 2) Fă loc în coloana nouă
    await Card.updateMany(
      { column: newColumnId, order: { $gte: newPosition } },
      { $inc: { order: 1 } }
    );

    // 3) Mută efectiv cardul
    card.column = newColumnId;
    card.order = newPosition;
    await card.save();

    res.status(200).json({ status: "success", data: card });
  } catch (error) {
    next(error);
  }
};
