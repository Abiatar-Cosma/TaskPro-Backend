// models/Card.js
const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: { type: String, maxlength: 500 },
    priority: { type: String, enum: ["low", "medium", "high"], default: "low" },

    // ⇩⇩⇩ standard: dueDate în DB; alias "deadline" pentru compatibilitate UI
    dueDate: { type: Date, default: null, alias: "deadline" },

    column: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include alias în JSON
    toObject: { virtuals: true }, // include alias în toObject()
  }
);

CardSchema.index({ column: 1, order: 1 });

module.exports = mongoose.model("Card", CardSchema);
