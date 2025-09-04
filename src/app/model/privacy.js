const mongoose = require("mongoose");

const privacySchema = new mongoose.Schema(
  {
    privacy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Privacy", privacySchema);
