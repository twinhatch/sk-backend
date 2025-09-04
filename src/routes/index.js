"use strict";
module.exports = (app) => {
  app.use("/api", require("./v1_routes"));
  app.get("/", (req, res) => res.status(200).json({ status: "OK" }));
};
