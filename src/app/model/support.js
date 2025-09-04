"use strict";

const mongoose = require("mongoose");
const supportSchema = new mongoose.Schema(
    {
        support_id: {
            type: String,
        },
        userSocket: {
            type: String,
        },
        adminSocket: {
            type: String,
        },
        query: {
            type: String,
        },
        sub_query: {
            type: String,
        },
        satisfied: {
            type: Boolean,
            default: false
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

supportSchema.set("toJSON", {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("Support", supportSchema);
