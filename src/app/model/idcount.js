"use strict";

const mongoose = require("mongoose");

const idcountSchema = new mongoose.Schema(
    {
        package: {
            type: Number,
            unique: true
        },
        traveller: {
            type: Number,
            unique: true
        },
        userID: {
            type: Number,
            unique: true
        }
    },
    {
        timestamps: true,
    }
);


module.exports = mongoose.model("IdcountSchema", idcountSchema);