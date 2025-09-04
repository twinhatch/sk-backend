let app = require("./express");
// const http = require("http");
// app = http.createServer(app);
// const cors = require("cors");
// const socketIO = require("socket.io")(app, {
//   cors: {
//     origin: "https://traveller.paulbarberapp.com/",
//   },
// });
// const mongoose = require("mongoose");
// const { Server, Socket } = require("socket.io");

// const Chat = mongoose.model("Chat");

// const io = new Server(app, {
//   cors: {
//     origin: "https://traveller.paulbarberapp.com/",
//   },
// });

// io.on("connection", (socket) => {
//   console.log(`${socket.id} user is just connected`);

//   socket.on("getAllMessage", async (payload) => {
//     console.log("payload=====>", payload);
//     const getAllChat = await Chat.find({
//       connection: payload.connection,
//       $or: [
//         { sender: payload.sender, receiver: payload.receiver },
//         { sender: payload.receiver, receiver: payload.sender },
//       ],
//     });
//     console.log(getAllChat);
//     socket.emit("messages", getAllChat);
//   });
// });

const server = app.listen(process.env.PORT || 3001, () => {
  console.log("process listening ON", process.env.PORT || 3000);
});
module.exports = server;
