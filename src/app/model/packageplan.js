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

const packagePlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    type: {
      type: String,
    },
    bonus: {
      type: String,
    },
    item_image: {
      type: String,
    },
    weight: {
      type: String,
    },
    qty: {
      type: Number,
    },
    value: {
      type: String,
    },
    delivery_date: {
      type: Date,
    },
    accepted_delivery_date: {
      type: Date,
    },
    fulldelivery_address: {
      type: String,
    },
    delivery_address: {
      type: String,
    },
    address: {
      type: String,
    },
    pickupaddress: {
      type: String,
    },
    track_id: {
      type: String,
      default: '0',
    },
    location: {
      type: pointSchema,
    },
    tolocation: {
      type: pointSchema,
    },
    newlocation: {
      type: pointSchema,
    },
    newpickup: {
      type: String,
    },
    oldlocation: {
      type: pointSchema,
    },
    oldpickup: {
      type: String,
    },
    route: {
      type: String,
      enum: ["LOCAL", "CITY", "COUNTRY", "STATE"],
      default: "LOCAL",
    },
    km: {
      type: Number
    },
    track: {
      type: pointSchema,
    },
    track_address: {
      type: String,
    },
    deviceToken: {
      type: String,
    },
    description: {
      type: String,
    },
    phone: {
      type: String,
    },
    mot: {
      type: String,
    },
    seat_avaibility: {
      type: Number,
    },
    ridechedule: {
      type: Date,
    },
    shipingcharge: {
      type: Number,
    },
    bonus: {
      type: Number,
    },
    total: {
      type: Number,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    active: {
      type: Boolean,
      default: true,
    },
    jobStatus: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "PICKUP",
        "PICUPED",
        "DELIVER",
        "DELIVERED",
        "TIMEUP",
        "REVOKE"
      ],
      default: "PENDING",
    },
    finaldeliveryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Approved", "Rejected"],
      default: "Approved",
    },
    paymentDetail: {
      type: Object
    },
    changedTraveller: {
      type: Boolean,
      default: false,
    },
    rejectedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    }
  },
  {
    timestamps: true,
  }
);
packagePlanSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});
packagePlanSchema.index({ location: "2dsphere" });
packagePlanSchema.index({ tolocation: '2dsphere' });
packagePlanSchema.index({ track: '2dsphere' });
packagePlanSchema.index({ newlocation: '2dsphere' });
packagePlanSchema.index({ oldlocation: '2dsphere' });
module.exports = mongoose.model("PackagePlan", packagePlanSchema);
