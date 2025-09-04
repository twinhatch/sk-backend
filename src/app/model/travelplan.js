"use strict";

const mongoose = require("mongoose");
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const travelPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    jurney_date: {
      type: Date,
    },
    route: {
      type: String,
      enum: ["LOCAL", "CITY", "COUNTRY", "STATE"],
      default: "LOCAL",
    },
    departure_time: {
      type: Date,
    },
    track_id: {
      type: String,
      default: '0',
    },
    estimate_time: {
      type: Date,
    },
    mot: {
      type: String,
    },
    seat_avaibility: {
      type: Number,
    },
    profit_potential: {
      type: String,
    },
    description: {
      type: String,
    },
    fromaddress: {
      type: String,
    },
    toaddress: {
      type: String,
    },
    address: {
      type: String,
    },
    location: {
      type: pointSchema,
    },
    tolocation: {
      type: pointSchema,
    },
    payamount: {
      type: Number,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    track: {
      type: pointSchema,
    },
    track_address: {
      type: String,
    },
    paymentDetail: {
      type: Object
    }
  },
  {
    timestamps: true,
  }
);
travelPlanSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});
travelPlanSchema.index({ location: "2dsphere" });
travelPlanSchema.index({ tolocation: "2dsphere" });
travelPlanSchema.index({ track: "2dsphere" });
module.exports = mongoose.model("TravelPlan", travelPlanSchema);
