"use strict";

const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      trim: true,
      enum: ["USER", "TRAVELLER", "ADMIN"],
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    travelPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TravelPlan",
    },
    packagePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PackagePlan",
    },
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
    },
    status: {
      type: String,
      default: "PENDING",
    },
    notification: {
      type: String,
      trim: true,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
