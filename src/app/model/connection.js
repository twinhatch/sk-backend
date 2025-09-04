"use strict";

const mongoose = require("mongoose");
const connectionSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      trim: true,
      enum: ["USER", "TRAVELLER"],
    },
    notification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
    },
    packagerid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    travellerid: {
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
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONNECTED",
        "ACCEPT",
        "ACCEPTED",
        "REJECTED",
        "PICKUP",
        "PICUPED",
        "DELIVER",
        "DELIVERED",
        "CANCELED"
      ],
      default: "PENDING",
    },
    delivery_date: {
      type: Date,
    },
    finaldeliveryDate: {
      type: Date,
    },
    packagerSocket: {
      type: String,
    },
    travelerSocket: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

connectionSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Connection", connectionSchema);
