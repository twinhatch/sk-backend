"use strict";
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const config = require("config");
// module.exports = () => {
const options = {
  // keepAlive: 1000,
  useNewUrlParser: true,
  // useCreateIndex: true,
  // useFindAndModify: false,
  useUnifiedTopology: true,
};
mongoose.set('strictQuery', true)
mongoose.connect(process.env.MONGO_URL, options, (err, db) => {
  if (err) console.log("Mongoose connection error", err.message);
});
mongoose.connection.on("connected", function () {
  console.log("Mongoose connected");
});
mongoose.connection.on("disconnected", function () {
  console.log("Mongoose default connection disconnected");
});
mongoose.connection.on(
  "error",
  console.error.bind(console, "MongoDb connection error")
);

process.on("SIGINT", function () {
  mongoose.connection.close(function () {
    console.log(
      "Mongoose default connection disconnected through app termination"
    );
    process.exit(0);
  });
});
// };
