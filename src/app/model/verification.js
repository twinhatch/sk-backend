"use strict";
const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: String,
    },
    expiration_at: {
      type: Date,
    },
    otp: {
      type: Number,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

verificationSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Verification", verificationSchema);
