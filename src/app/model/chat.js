"use strict";

const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      trim: true,
      enum: ["USER", "TRAVELLER", "ADMIN"],
    },
    message: {
      type: String,
    },
    support_user: {
      type: String
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    msgtime: {
      type: Date,
      default: new Date(),
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Chat", chatSchema);
