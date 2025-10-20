const Card = require("../models/Card");
const Column = require("../models/Column");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require("../utils/errors");

// Create a new card in a column
exports.updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1) Normalizează payload: deadline -> dueDate
    const body = { ...req.body };
    if (body.deadline && !body.dueDate) body.dueDate = body.deadline;
    delete body.deadline; // nu păstrăm două nume pentru același câmp

    // 2) Găsește cardul și verifică drepturile
    const card = await Card.findById(id);
    if (!card) throw new NotFoundError("Card not found");
    if (card.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this card"
      );
    }

    // 3) Doar câmpuri permise
    const allowed = ["title", "description", "priority", "labels", "dueDate"];

    // Normalizează priority
    const normalizePriority = (p) => {
      if (p == null) return undefined;
      const map = { "without priority": "low", without: "low" }; // dacă vrei „fără prioritate” = low
      const val = map[p] || p;
      const ok = ["low", "medium", "high"].includes(val);
      if (!ok)
        throw new BadRequestError(
          "Invalid priority. Allowed: low, medium, high."
        );
      return val;
    };

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        if (field === "priority") {
          const p = normalizePriority(body.priority);
          if (p !== undefined) card.priority = p;
        } else if (field === "dueDate") {
          if (body.dueDate == null || body.dueDate === "") {
            card.dueDate = undefined; // șterge deadline-ul dacă trimiți null/'' (opțional)
          } else {
            const d = new Date(body.dueDate);
            if (Number.isNaN(d.getTime())) {
              throw new BadRequestError("Invalid date for dueDate/deadline");
            }
            card.dueDate = d;
          }
        } else {
          card[field] = body[field];
        }
      }
    }

    await card.save();

    res.status(200).json({ status: "success", data: card });
  } catch (error) {
    next(error);
  }
};

// Get all cards for a specific column
exports.getCardsByColumnId = async (req, res, next) => {
  try {
    const { columnId } = req.params;

    const column = await Column.findById(columnId);
    if (!column) {
      throw new NotFoundError("Column not found");
    }

    if (column.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to view cards in this column"
      );
    }

    const cards = await Card.find({ column: columnId }).sort({ order: 1 });

    res.status(200).json({
      status: "success",
      data: cards,
    });
  } catch (error) {
    next(error);
  }
};

// Get a card by ID
exports.getCardById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError("Card not found");
    }

    if (card.owner.toString() !== req.user.id) {
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

// Update a card
exports.updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError("Card not found");
    }

    if (card.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this card"
      );
    }

    const allowedFields = [
      "title",
      "description",
      "dueDate",
      "priority",
      "labels",
    ];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        card[field] = updateData[field];
      }
    });

    await card.save();

    res.status(200).json({
      status: "success",
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a card
exports.deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError("Card not found");
    }

    if (card.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to delete this card"
      );
    }

    await Card.findByIdAndDelete(id);

    // Update order of remaining cards
    await Card.updateMany(
      {
        column: card.column,
        order: { $gt: card.order },
      },
      { $inc: { order: -1 } }
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Update the order of cards in a column
exports.updateCardsOrder = async (req, res, next) => {
  try {
    const { columnId, cardOrders } = req.body;

    const column = await Column.findById(columnId);
    if (!column) {
      throw new NotFoundError("Column not found");
    }

    if (column.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to reorder cards in this column"
      );
    }

    const updatePromises = cardOrders.map(({ id, order }) =>
      Card.findOneAndUpdate(
        { _id: id, owner: req.user.id },
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

// Move a card to another column
exports.moveCardToColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newColumnId, newPosition } = req.body;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError("Card not found");
    }

    if (card.owner.toString() !== req.user.id) {
      throw new ForbiddenError("You do not have permission to move this card");
    }

    const destinationColumn = await Column.findById(newColumnId);
    if (!destinationColumn) {
      throw new NotFoundError("Destination column not found");
    }

    if (destinationColumn.owner.toString() !== req.user.id) {
      throw new ForbiddenError(
        "You do not have permission to add cards to this column"
      );
    }

    const sourceColumnId = card.column;

    // 1. Scoate cardul din coloana veche (ordinele rămase scad)
    await Card.updateMany(
      { column: sourceColumnId, order: { $gt: card.order } },
      { $inc: { order: -1 } }
    );
    // 2. Insera cardul în noua coloană la noua poziție (ceilalți urcă)
    await Card.updateMany(
      { column: newColumnId, order: { $gte: newPosition } },
      { $inc: { order: 1 } }
    );

    // 3. Actualizează cardul propriu-zis
    card.column = newColumnId;
    card.order = newPosition;
    await card.save();

    res.status(200).json({
      status: "success",
      data: card,
    });
  } catch (error) {
    next(error);
  }
};
