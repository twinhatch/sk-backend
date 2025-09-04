"use strict";

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        issue: {
            type: String,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        userType:{
            type: String,
        },
        connection:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Connection",
        }
    },
    {
        timestamps: true,
    }
);
// reportSchema.set("toJSON", {
//     getters: true,
//     virtuals: false,
//     transform: (doc, ret, options) => {
//         delete ret.__v;
//         return ret;
//     },
// });


module.exports = mongoose.model("Report", reportSchema);
