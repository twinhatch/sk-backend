const apps = require("express")();
require("dotenv").config();
const passport = require("passport");
const bodyParser = require("body-parser");
const noc = require("no-console");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(apps);
const io = socketIo(server);
const mongoose = require("mongoose");


// Bootstrap schemas, models
require("./bootstrap");

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  socket.emit('updatedId', socket.id)
  socket.on('join', async (data) => {
    socket.join(data)
    io.to(data).emit('joined-user', socket.id)
  })
  socket.on('packagecreated', () => {
    io.emit('newpackageCreated')
  })
  console.log(`Socket Connected`, socket.id);


  socket.on('joinadmin', () => {
    socket.join('admin');
  })
  socket.on('joinRoom', async (data) => {
    const Connection = mongoose.model("Connection");
    const Support = mongoose.model("Support");
    if (data.user) {
      // await Connection.findByIdAndUpdate(data.locationId, {
      //   $set: { [data.key]: socket.id }
      // })
      // console.log('user from socket------>', data)
      // await Connection.updateMany({ [data.userkey]: data.user._id }, {
      //   $set: { [data.key]: socket.id }
      // })
      socket.join(data.locationId);
    }

    if (data.masterKey) {
      // await Connection.updateMany({ [data.masterKey]: { $in: data[data.masterKey] } }, {
      //   $set: { [data.key]: socket.id }
      // })
      socket.join(data.locationId);
    }

    if (data.support_id) {
      const SupportChat = mongoose.model("SupportChat");


      if (data.key) {
        await Support.updateMany({ support_id: data.support_id }, {
          $set: { [data.key]: socket.id }
        })
      } else {
        await Support.updateMany({}, {
          $set: { adminSocket: socket.id }
        })
      }

      let newDate = new Date().setDate(new Date().getDate() - 5);
      await SupportChat.deleteMany({ msgtime: { $lt: newDate } })
      socket.join(data.support_id);

    }
  });

  socket.on("chatuser", async (data) => {
    const Support = mongoose.model("Support");
    const PackagePlan = mongoose.model("PackagePlan");
    const TravelPlan = mongoose.model("TravelPlan");

    const getAllChat = await Support.find().populate("userId", "-password")
      .sort({ updatedAt: -1, 'userId.completedDelivery': -1 });
    let userArray = []
    let newdata = []

    await Promise.all(
      getAllChat.map(async (item) => {
        // if (item.userId._id.toString() !== data.sender && !userArray.includes(item.userId._id)) {
        //   userArray.push(item.sender._id)
        let package = []
        let travelplan = []
        if (item.userId && item.userId._id) {
          package = await PackagePlan.find({ user: item.userId._id }, 'track_id').sort({ createdAt: -1 }).limit(10);
          travelplan = await TravelPlan.find({ user: item.userId._id }, 'track_id').sort({ createdAt: -1 }).limit(10);
        }

        newdata.push({ ...item._doc, package, travelplan })
        // }
      }))

    socket.emit("userlist", newdata);
  });

  socket.on("getsupportMessages", async (data) => {
    const SupportChat = mongoose.model("SupportChat");
    const getAllChat = await SupportChat.find(data)
      .populate("sender receiver", "-password").populate('connection')
      .sort({ createdAt: -1 });

    socket.emit("messages", getAllChat);
  });

  socket.on('onsupport', (u) => {
    console.log('onsupport===>', u)
    io.emit("updateConnection", {});
  })

  socket.on("createSupportMessage", async (data) => {
    console.log(data)
    const SupportChat = mongoose.model("SupportChat");
    const Support = mongoose.model("Support");
    const chat = new SupportChat(data);
    await chat.save();
    const con = await Support.findOne({ support_id: data.support_id })
    const getAllChat = await SupportChat.find({ support_id: data.support_id })
      .populate("sender receiver", "-password").populate('connection')
      .sort({ createdAt: -1 });
    console.log(con)
    if (con.satisfied && data.userId) {
      io.to(data.support_id).emit("allmessages", getAllChat);
      io.emit("updateConnection", {});
      // socket.emit('updateConnection')
      con.satisfied = false;
      await con.save()
    } else {
      io.to(data.support_id).emit("allmessages", getAllChat);
    }

    socket.emit("messages", getAllChat);
  });

  socket.on("satisfied", async (data) => {
    const SupportChat = mongoose.model("SupportChat");
    const Support = mongoose.model("Support");
    const chat = new SupportChat(data);
    await chat.save();
    const con = await Support.findOne({ support_id: data.support_id })
    con.satisfied = data.type || false;
    await con.save()
    const getAllChat = await SupportChat.find({ support_id: data.support_id })
      .populate("sender receiver", "-password").populate('connection')
      .sort({ createdAt: -1 });
    console.log(con)
    io.to(data.support_id).emit("allmessages", getAllChat);
    io.emit("updateConnection", {});
    socket.emit("messages", getAllChat);
  });

  socket.on("getMessages", async (data) => {
    const Chat = mongoose.model("Chat");
    let cond = {
      sender: {
        $in: [
          mongoose.Types.ObjectId(data.sender),
          mongoose.Types.ObjectId(data.receiver),
        ],
      },
      receiver: {
        $in: [
          mongoose.Types.ObjectId(data.receiver),
          mongoose.Types.ObjectId(data.sender),
        ],
      },
    }
    if (data.connection) {
      cond.connection = data.connection

    }
    if (data.support_user) {
      cond.support_user = data.support_user
    }
    const getAllChat = await Chat.find(cond)
      .populate("sender receiver", "-password").populate('connection')
      .sort({ createdAt: -1 });

    socket.emit("messages", getAllChat);
  });

  socket.on("createMessage", async (data) => {

    const Chat = mongoose.model("Chat");
    const Connection = mongoose.model("Connection");
    let con = {}
    const chat = new Chat(data);
    await chat.save();
    let cond = {
      sender: {
        $in: [
          mongoose.Types.ObjectId(data.sender),
          mongoose.Types.ObjectId(data.receiver),
        ],
      },
      receiver: {
        $in: [
          mongoose.Types.ObjectId(data.receiver),
          mongoose.Types.ObjectId(data.sender),
        ],
      },
    }

    if (data.connection) {
      cond.connection = data.connection
      // con = await Connection.findById(data.connection)
      // socket.join(data.connection);
      // var roster = io.sockets.rooms(data.connection);
      // console.log(roster)

      // roster.forEach(function (client) {
      //   console.log('Username: ' + client.nickname);
      // });
    }

    if (data.support_user) {
      cond.support_user = data.support_user
    }
    console.log('data==>', data)
    // const userRooms = Array.from(socket.rooms);
    // console.log(`User is in rooms: ${userRooms}`);
    console.log(` user: ${socket.id}`), con[data.key];
    console.log(` con: ${con}`);
    const getAllChat = await Chat.find(cond)
      .populate("sender", "-password")
      .sort({ createdAt: -1 });
    // io.emit("messages", getAllChat);

    io.to(data.connection).emit("allmessages", getAllChat);
    // if (data.connection) {
    // io.to(con[data.key]).emit("allmessages", getAllChat);
    socket.emit("messages", getAllChat);
    // } else {
    //   io.emit("allmessages", getAllChat);
    //   // io.to(data.sender).to(data.receiver).emit("messages", getAllChat); // Broadcast the chat message to all connected clients
    // }

    // io.in(data.sender).emit("messages", getAllChat); // Broadcast the chat message to all connected clients
  });

  socket.on('statuschanged', async (locationID) => {
    const Connection = mongoose.model("Connection");
    const con = await Connection.findById(locationID.con_id)
    io.to(locationID.con_id).emit('receivedstatus', { ...locationID, newStatus: con.status })
    // if (locationID.userid) {
    io.to(con[locationID.userType]).emit('receivedstatus', { ...locationID, newStatus: con.status })
    // }
    // io.to(con[locationID.key]).emit('receivedstatus', locationID)
  })

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  //// video call code start ////
  socket.on("room:join", (data) => {
    const { email, room } = data;
    console.log('data----->', data)
    // emailToSocketIdMap.set(email, socket.id);
    // socketidToEmailMap.set(socket.id, email);
    socket.join(room);
    io.to(room).emit("user:joined", { email, id: socket.id });
    io.to(socket.id).emit("room:join", data);

  });

  socket.on("user:call", ({ to, offer }) => {
    console.log(to, offer)
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  //// video call code end ////
});
// App configuration
noc(apps);
apps.use(bodyParser.json());
apps.use(passport.initialize());
apps.use(cors());

//Database connection
require("./db");
//Passport configuration
require("./passport")(passport);
//Routes configuration
require("./../src/routes")(apps);
const app = server;
module.exports = app;
