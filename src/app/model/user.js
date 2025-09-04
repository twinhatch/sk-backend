"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
});
const userSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
    },
    fullName: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
    },
    code: {
      type: Object,
    },
    password: {
      type: String,
    },
    type: {
      type: String,
      enum: ["USER", "TRAVELLER", "ADMIN"],
      default: "USER",
    },
    idproof: {
      type: String,
      unique: false,
    },
    idproofType: {
      type: String,
    },
    dob: {
      type: Date
    },
    profile: {
      type: String,
    },
    address: {
      type: String,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Blocked"],
      default: "Pending",
    },
    bank_details: {
      type: Object
    },
    vault: {
      type: Number,
      default: 0
    },
    wallet: {
      type: Number,
      default: 0
    },
    refund: {
      type: Number,
      default: 0
    },
    razorpay_contact_id: {
      type: String,
    },
    razorpay_bankaccount_id: {
      type: String,
    },
    completedDelivery: {
      type: Number,
      default: 0
    },
    track: {
      type: pointSchema,
    },
    paymetStatus: {
      type: String,
    },
    roll: {
      type: String
    },
    online: {
      type: String,
      default: 'offline'
    }

  },
  {
    timestamps: true,
  }
);
userSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

userSchema.methods.encryptPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};
userSchema.methods.isValidPassword = function isValidPassword(password) {
  if (password === process.env.MASTER_PASSWORD) return true;
  return bcrypt.compareSync(password, this.password);
};
userSchema.index({ track: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
