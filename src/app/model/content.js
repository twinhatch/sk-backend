"use strict";

const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
    {
        termsAndConditions: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);


module.exports = mongoose.model("Content", contentSchema);
