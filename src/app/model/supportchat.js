"use strict";

const mongoose = require("mongoose");
const supportchatSchema = new mongoose.Schema(
    {
        message: {
            type: String,
        },
        support_id: {
            type: String,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        connection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Support",
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

supportchatSchema.set("toJSON", {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("SupportChat", supportchatSchema);
