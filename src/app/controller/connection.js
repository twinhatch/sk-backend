const { request } = require("express");
const mongoose = require("mongoose");
const { Socket } = require("socket.io");
const { getReview } = require("../helper/user");
const { notify } = require("../services/notification");
const moment = require("moment");
const { tranferToAccount } = require("../services/payout");


const Connection = mongoose.model("Connection");
const TravelPlan = mongoose.model("TravelPlan");
const PackagePlan = mongoose.model("PackagePlan");
const Notification = mongoose.model("Notification");
const Chat = mongoose.model("Chat");
const Review = mongoose.model("Review");
const User = mongoose.model("User");

module.exports = {
  createConnection: async (req, res) => {
    try {
      const payload = req?.body || {};

      // const getConn = await Connection.find({
      //   travelPlan: payload.travelPlan,
      //   packagePlan: payload.packagePlan,
      // });
      let package = await PackagePlan.findById(payload.packagePlan).populate('user', 'fullName');
      const getConnbyStatus = await Connection.find({
        packagePlan: payload.packagePlan,
        status: {
          $in: [
            "ACCEPTED",
            "PICKUP",
            "PICUPED",
            "DELIVER",
            "DELIVERED",
            // "CANCELED"
          ]
        }
      });
      console.log(getConnbyStatus)
      if (getConnbyStatus.length > 0) {
        if (getConnbyStatus[0].travelPlan.toString() === payload.travelPlan) {
          if (payload.from === 'chat') {
            package.changedTraveller = true;
            await package.save()
          }

          return res.status(201).json({
            success: false,
            message: "Already connected this plan",
            connection: getConnbyStatus[0],
          });
        } else {
          return res.status(201).json({
            success: false,
            message: "Package has been assigned someone else",
          });
        }
      }
      payload.userType = req.user.type;
      // if (payload.status === "CONNECTED") {
      let travellerPlan = await TravelPlan.findById(payload.travelPlan).populate('user', 'fullName');
      payload.delivery_date = package.delivery_date;
      payload.notification = payload.id;
      let connect = new Connection(payload);
      const noti = await connect.save();
      let travellerUser = travellerPlan.user

      if (package.jobStatus === 'REVOKE') {

        noti.status = 'ACCEPTED';
        await noti.save();
        // package.jobStatus = 'ACCEPTED';
        await PackagePlan.findByIdAndUpdate(payload.packagePlan, { jobStatus: 'ACCEPTED' })
        await Notification.findByIdAndUpdate(payload.id, {
          $set: {
            status: payload.status,
            connection: connect._id
          }
        });
        return res.status(201).json({
          success: true,
          connection: connect,
          message: "Data Saved successfully!",
        });
      }

      if (package.description) {
        const data = {
          message: package.description,
          userType: "USER",
          sender: package.user,
          receiver: connect.travellerid,
          connection: connect._id,
        };
        const chat = new Chat(data);
        await chat.save();
      }
      if (travellerPlan.description) {
        const data2 = {
          message: travellerPlan.description,
          userType: "TRAVELLER",
          sender: travellerPlan.user,
          receiver: connect.packagerid,
          connection: connect._id,

        };
        const chat2 = new Chat(data2);
        await chat2.save();
      }
      let notifications = ''
      if (payload.id) {

        notifications = await Notification.findByIdAndUpdate(payload.id, {
          $set: {
            status: payload.status,
            connection: connect._id
          }
        });
      } else {
        let receverId = "";
        if (req.user.type === "USER") {
          receverId = payload.travellerid;
        } else {
          receverId = payload.packagerid;
        }
        const data = {
          userType: req.user.type,
          senderId: req.user.id,
          receverId,
          travelPlan: payload.travelPlan,
          packagePlan: payload.packagePlan,
          status: "CONNECTED",
          // notification: "Connection for chat",
          connection: connect._id
        };
        const noti = await Notification.create(data);
        payload.notification = noti._id;
        connect.notification = noti._id
        notifications = await connect.save()

      }
      let content = ''

      if (req.user.type === 'USER') {

        content = `${package.user.fullName} is trying to connect for delivering ${package.name} to ${package.delivery_address}`
      } else {
        content = `${travellerUser.fullName} is trying to connect for delivering ${package.name} to ${package.delivery_address}`
      }
      await Notification.create({
        userType: req.user.type,
        senderId: req.user.id,
        receverId: req.user.type === 'USER' ? connect.travellerid : connect.packagerid,
        travelPlan: connect.travelPlan,
        packagePlan: connect.packagePlan,
        notification: content,
        connection: connect._id,
        status: 'NORMAL'
      })

      await notify({ to: req.user.type === 'USER' ? connect.travellerid : connect.packagerid, content: content })
      if (payload.from === 'chat') {
        package.changedTraveller = true;
        await package.save()
      }

      return res.status(201).json({
        success: true,
        connection: connect,
        message: "Data Saved successfully!",
      });
      // } else {
      //   return res.status(201).json({
      //     success: true,
      //     message: "Data Saved successfully!",
      //   });
      // }

      // if (payload.status === "ACCEPTED" || payload.status === "REJECTED") {
      //   await PackagePlan.findByIdAndUpdate(payload.packagePlan, {
      //     $set: { jobStatus: payload.status },
      //   });
      // }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  getConnectionByUser: async (req, res) => {
    try {
      if (req.user.type === 'ADMIN') {
        const notifications = await Connection.find({})
          .populate({
            path: 'travellerid packagerid',
            select: "-password"
          }).populate('travelPlan packagePlan')
          .sort({ createdAt: -1 });

        return res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          data: notifications,
        });
      } else {
        console.log("sdadssa", req.user);
        let newDate = new Date().setDate(new Date().getDate() - 1);
        let cond = {
          status: { $ne: 'REJECTED' }
        };
        let required = "";
        if (req.user.type === "USER") {
          cond.finaldeliveryDate = { $gte: new Date(newDate).getTime() };
          cond.packagerid = req.user.id;
          required = "travelPlan";
        } else {
          cond.finaldeliveryDate = { $gte: new Date(newDate).getTime() };
          cond.travellerid = req.user.id;
          required = "packagePlan";
        }
        console.log(cond);
        const notifications = await Connection.find(cond, required)
          .populate({
            path: required,
            match: { jobStatus: { $ne: "PENDING" } },
            populate: { path: "user", select: "-password" },
          })
          .sort({ createdAt: -1 });
        let newData = notifications.filter((f) => f[required] !== null);
        res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          data: newData,
        });
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  onlineNotify: async (req, res) => {
    try {
      console.log("sdadssa", req.user);
      let newDate = new Date();
      let cond = {};
      let required = "";

      if (req.user.type === "USER") {
        cond.delivery_date = { $gte: new Date(newDate).getTime() };
        cond.packagerid = req.user.id;
        required = "travelPlan";
      } else {
        cond.delivery_date = { $gte: new Date(newDate).getTime() };
        cond.travellerid = req.user.id;
        required = "packagePlan";
      }
      console.log(cond);
      // const notifications = await Connection.find(cond)
      //   .populate({
      //     path: required,
      //     match: {
      //       $and: [{ jobStatus: { $ne: "PENDING" } }, { jobStatus: { $ne: 'ACCEPTED' } }, { jobStatus: { $ne: 'ACCEPT' } }, { jobStatus: { $ne: "REJECTED" } },]
      //       // jobStatus: { $ne: ["PENDING", 'ACCEPTED'] }
      //     },
      //   }).populate('')
      //   .sort({ createdAt: -1 });
      // let newData = notifications.filter((f) => f[required] !== null);

      // await Promise.all(
      //   notifications.forEach(async f => {
      //     if (f[required] !== null) {
      //       const notObj = {
      //         userType: req.user.type,
      //         senderId: req.user.id,
      //         receverId: f.packagerid,
      //         travelPlan: f.travelPlan,
      //         packagePlan: f.packagePlan,
      //         notification: req.body.content,
      //         connection: f._id,
      //         status: 'TRACK'
      //       };
      //       console.log(f)
      //       await PackagePlan.findByIdAndUpdate(f.packagerid, {
      //         track: {
      //           type: "Point",
      //           coordinates: req.body.track,
      //         },
      //       })
      //       await Notification.create(notObj);
      //       await notify({ to: f[required].user, content: req.body.content })
      //     }
      //   })
      // )

      res.status(200).json({
        success: true,
        message: "Fetched all notification successfully",
        // data: newData,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  getConnectionByplan: async (req, res) => {
    try {
      let newDate = new Date().setDate(new Date().getDate() - 2);
      console.log("sdadssa", req.user);
      if (req && req.user && req.user.type == "ADMIN") {
        //How this line is working need to ask from chetan

        const notifications = await Connection.find({
          // delivery_date: { $gt: newDate },
          status: { $nin: ['REJECTED'] },
          $or: [
            { finaldeliveryDate: { $exists: false } },
            { finaldeliveryDate: { $gt: newDate } }
          ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          data: notifications,
        });
      } else {
        const cond = {
          status: { $nin: ['PENDING', 'REJECTED', 'CANCELED'] }
        };
        if (req.user.type === "USER") {
          cond.packagePlan = req.params.plan_id;
          cond.packagerid = req.user.id;
        } else {
          cond.travelPlan = req.params.plan_id;
          cond.travellerid = req.user.id;

        }
        console.log(cond);
        cond.$or = [
          { finaldeliveryDate: { $exists: false } },
          { finaldeliveryDate: { $gt: newDate } }
        ]


        const notifications = await Connection.find(cond)
          .populate(
            "packagerid travellerid",
            "-password"
          ).populate('travelPlan packagePlan')
          .sort({ createdAt: -1 });
        res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          data: notifications,
        });
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  conctionAcceptReject: async (req, res) => {
    try {

      let payload = req.body;
      let user = await User.findById(req.user.id)

      const getConnbyStatus = await Connection.find({
        packagePlan: payload.packagePlan,
        status: {
          $in: [
            "ACCEPTED",
            "PICKUP",
            "PICUPED",
            "DELIVER",
            "DELIVERED",
            // "CANCELED"
          ]
        }
      });
      console.log(getConnbyStatus)
      if (getConnbyStatus.length > 0 && (payload.status === "ACCEPT" || payload.status === "ACCEPTED")) {
        if (getConnbyStatus[0].travelPlan.toString() === payload.travelPlan) {
          return res.status(201).json({
            success: false,
            message: "Already accepted this plan",
            connection: getConnbyStatus[0],
          });
        } else {
          return res.status(201).json({
            success: false,
            message: "Sorry, The package was already accepted by another traveller.",
          });
        }
      }

      let notifications = {}
      if (req.body.conn_id) {
        notifications = await Connection.findById(req.body.conn_id).populate('packagePlan travelPlan packagerid travellerid')
      }
      if (!payload.conn_id && payload.packagePlan && payload.prestatus) {
        notifications = await Connection.findOne({ packagePlan: payload.packagePlan, status: payload.prestatus }).populate('packagePlan travelPlan packagerid travellerid')

        payload.conn_id = notifications._id
      }

      let cond = { status: payload.status };
      let pc = {
      }
      if (payload.status !== "ACCEPT") {
        pc.jobStatus = payload.status
      }
      if (payload.status === "ACCEPTED") {
        cond.delivery_date = payload.delivery_date;
        pc.accepted_delivery_date = payload.delivery_date
        await Connection.deleteMany({ _id: { $ne: payload.conn_id }, packagePlan: notifications.packagePlan._id })
        await Notification.updateMany({ notification: { $ne: payload.conn_id }, packagePlan: notifications.packagePlan._id }, { status: "REVOKE" })
      }

      if (payload.status === "ACCEPT") {
        pc.track = {
          type: "Point",
          coordinates: payload.track,
        }
        pc.track_address = payload.address
        pc.deviceToken = payload.token
        if (payload.isCanceled === 'true') {
          payload.status = "ACCEPTED"
          cond.status = "ACCEPTED"
          pc.jobStatus = "ACCEPTED"
          pc.accepted_delivery_date = payload.accepted_delivery_date
          cond.delivery_date = payload.accepted_delivery_date
          await PackagePlan.findByIdAndUpdate(payload.packagePlan, pc);
        }
      }

      if (payload.status !== 'DELIVERED') {
        if (payload.status == 'DELIVER') {
          pc.finaldeliveryDate = new Date();
        }
        await PackagePlan.findByIdAndUpdate(payload.packagePlan, pc);
      }


      if (payload.status === 'REJECTED') {
        await PackagePlan.findByIdAndUpdate(payload.packagePlan, { $push: { rejectedBy: notifications.travellerid._id }, changedTraveller: false });
        await Notification.updateMany({ connection: notifications._id }, { status: "REJECTED" })
      }

      if (payload.status === 'DELIVERED') {
        cond.finaldeliveryDate = new Date()
        if (!payload.conn_id) {
          // notifications = await Connection.findOne({ packagePlan: payload.packagePlan, status: 'DELIVER' }).populate('packagePlan travelPlan packagerid travellerid')

          payload.conn_id = notifications._id
          payload.content = `Your package has been delivered by ${notifications?.travellerid?.fullName} at ${payload.nwetime}`;
        }
        const travelller = await User.findById(notifications?.travellerid?._id)
        const package = await PackagePlan.findById(payload.packagePlan)
        let Commission = 0;
        let PaymentGatewayFees = 0;
        let gst = 0;
        if (package.total > 80) {
          Commission = (package.total / 100) * 5;
        } else {
          Commission = (package.total / 100) * 10;
        }
        PaymentGatewayFees = (package.total / 100) * 3;
        gst = (package.total / 100) * 5;
        const vault = (package.total / 100) * 5;
        let chargeswihpoint = vault + gst + PaymentGatewayFees + Commission;
        let travellerTotal = package.total - chargeswihpoint;

        travelller.wallet = travelller.wallet + travellerTotal;
        travelller.vault = travelller.vault + (vault * 3);
        travelller.completedDelivery = travelller.completedDelivery + 1
        // if (travelller.razorpay_bankaccount_id) {
        //   const data = await tranferToAccount(travelller.razorpay_bankaccount_id, package.total - vault, 'travelPlan', notifications.travelPlan._id)
        //   console.log(data)
        //   if (!data.status) {
        //     travelller.wallet = travelller.wallet + package.total - vault;
        //   }
        // } else {
        //   travelller.wallet = travelller.wallet + package.total - vault;
        //   travelller.completedDelivery = travelller.completedDelivery + 1
        // }
        travelller.paymetStatus = 'Pending'
        await travelller.save()
        package.finaldeliveryDate = new Date();
        package.jobStatus = payload.status;
        await package.save()
        // await PackagePlan.findByIdAndUpdate(payload.packagePlan, pc);
      }


      if (payload.status === 'PICKUP' && payload.isCanceled === 'true') {
        payload.status = "PICUPED"
        cond.status = "PICUPED"
        pc.jobStatus = "PICUPED"
        await PackagePlan.findByIdAndUpdate(payload.packagePlan, pc);
      }

      await Connection.findByIdAndUpdate(
        req.body.conn_id,
        cond
      )

      if (payload.status === "ACCEPT") {
        const noti = `${notifications.travellerid.fullName} is willing to deliver your ${notifications.packagePlan.name} to ${notifications.packagePlan.delivery_address}.`
        await notify({ to: notifications.packagerid._id, content: noti, data: { type: 'status', status: 'ACCEPT' } })
        await Notification.create({
          userType: req.user.type,
          senderId: req.user.id,
          receverId: notifications.packagerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: noti,
          connection: notifications._id,
          status: 'NORMAL'
        })
      }

      if (payload.status === "ACCEPTED") {
        const noti = `${user.fullName} has approved to deliver ${notifications.packagePlan.name} to ${notifications.travelPlan.toaddress} before ${moment(notifications.packagePlan.delivery_date).format('DD/MM/YYYY hh:mm A')} to earn Rs.${notifications.packagePlan.total}`
        await notify({ to: notifications.travellerid._id, content: noti, data: { type: 'status', status: 'ACCEPTED' } })
        await Notification.create({
          userType: req.user.type,
          senderId: req.user.id,
          receverId: notifications.travellerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: noti,
          connection: notifications._id,
          status: 'NORMAL'
        })
      }

      if (payload.status === "REJECTED") {
        const content = `${req.user.type === 'USER' ? notifications.packagerid.fullName : notifications.travellerid.fullName} has declined the offer for ${notifications.packagePlan.name}. Explore other ${req.user.type === 'USER' ? 'packages' : 'travellers'} available on your route`
        await notify({ to: req.user.type === 'USER' ? notifications.travellerid._id : notifications.packagerid._id, content: content, data: { type: 'status', status: 'REJECTED' } })
        await Notification.create({
          userType: req.user.type,
          senderId: req.user.id,
          receverId: req.user.type === 'USER' ? notifications.travellerid._id : notifications.packagerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: content,
          connection: notifications._id,
          status: 'NORMAL'
        })
      }

      if (payload.status === "PICKUP") {
        // let noti = `${notifications.packagePlan.name} has been picked up by ${notifications.travellerid.fullName}. Please confirm pickup from chat window`
        if (payload.isCanceled === 'true') {
          payload.status = "PICUPED"
          pc.status = "PICUPED"
          pc.jobStatus = "PICUPED"
          await PackagePlan.findByIdAndUpdate(payload.packagePlan, pc);
        } else {
          let noti = `${notifications.travellerid.fullName} has picked ${notifications.packagePlan.name}. Please confirm pickup from chat window`
          await Notification.create({
            userType: 'TRAVELLER',
            senderId: notifications.travellerid._id,
            receverId: notifications.packagerid._id,
            travelPlan: notifications.travelPlan._id,
            packagePlan: notifications.packagePlan._id,
            notification: noti,
            connection: notifications._id,
            status: 'PICKUP'
          })
          await notify({ to: notifications.packagerid._id, content: noti, data: { type: 'status', status: 'PICKUP' } })

        }



      }

      if (payload.status === "PICUPED") {
        if (!payload.content) {
          payload.content = `Your package has been picked up by ${notifications?.travellerid?.fullName} at ${payload.nwetime}`;
        }

        if (payload.confirm === 'no') {
          const content = `${notifications.packagerid.fullName} did not receive ${notifications.packagePlan.name}. Contact ${notifications.packagerid.fullName} and confirm delivery.`
          await Notification.create({
            userType: req.user.type,
            senderId: req.user.id,
            receverId: notifications.travellerid._id,
            travelPlan: notifications.travelPlan._id,
            packagePlan: notifications.packagePlan._id,
            notification: content,
            connection: notifications._id,
            status: 'NORMAL'
          })
          await notify({ to: notifications.travellerid._id, content: content, data: { type: 'status', status: 'PICUPED' } })
        } else {
          await Notification.create({
            userType: 'TRAVELLER',
            senderId: notifications.travellerid._id,
            receverId: notifications.packagerid._id,
            travelPlan: notifications.travelPlan._id,
            packagePlan: notifications.packagePlan._id,
            notification: payload.content,
            connection: notifications._id,
            status: 'NORMAL'
          })
          const content = `${notifications.packagerid.fullName} has verified pick up of ${notifications.packagePlan.name}. Deliver it within time to ${moment(notifications.packagePlan.delivery_date).format('DD/MM/YYYY hh:mm A')} to earn bonus of Rs. ${notifications.packagePlan.total} `
          await Notification.create({
            userType: req.user.type,
            senderId: req.user.id,
            receverId: notifications.travellerid._id,
            travelPlan: notifications.travelPlan._id,
            packagePlan: notifications.packagePlan._id,
            notification: content,
            connection: notifications._id,
            status: 'NORMAL'
          })
          await notify({ to: notifications.travellerid._id, content: content, data: { type: 'status', status: 'PICUPED' } })
          await notify({ to: notifications.packagerid._id, content: payload.content, data: { type: 'status', status: 'PICUPED' } })
        }
      }
      if (payload.status === "DELIVER") {
        await notify({
          to: notifications.packagerid._id,
          content: `${notifications.travellerid.fullName} has delivered "${notifications.packagePlan.name}" to Package "${notifications.packagePlan.delivery_address}" Please confirm delivery from Chat/Profile Page.`,
          data: { type: 'status', status: 'DELIVER' }
        })

        await Notification.create({
          userType: 'TRAVELLER',
          senderId: notifications.travellerid._id,
          receverId: notifications.packagerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: `${notifications.travellerid.fullName} has delivered "${notifications.packagePlan.name}" to Package "${notifications.packagePlan.delivery_address}". Please confirm delivery of ${notifications.packagePlan.name}`,
          connection: notifications._id,
          status: 'DELIVER'
        })
      }
      if (payload.status === "DELIVERED") {

        if (payload.noti_id) {
          await Notification.findByIdAndUpdate(payload.noti_id, { status: 'NORMAL' })
        }

        await Notification.create({
          userType: 'TRAVELLER',
          senderId: notifications.travellerid._id,
          receverId: notifications.packagerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: `Your package has been delivered by ${notifications?.travellerid?.fullName} at ${payload.nwetime}`,
          connection: notifications._id,
          status: 'NORMAL'
        })

        const content = `${notifications.packagerid.fullName} has confirmed delivery of ${notifications.packagePlan.name} to Package ${notifications.packagePlan.delivery_address}" You have earned Rs. ${notifications.packagePlan.total}`

        await Notification.create({
          userType: req.user.type,
          senderId: req.user.id,
          receverId: notifications.travellerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: content,
          connection: notifications._id,
          status: 'NORMAL'
        })
        await notify({ to: notifications.travellerid._id, content: `Congrats! you have earned Rs.${notifications.packagePlan.total}`, data: { type: 'status', status: 'DELIVERED' } })
        await notify({ to: notifications.packagerid._id, content: payload.content, data: { type: 'status', status: 'DELIVERED' } })
      }
      res.status(200).json({
        success: true,
        message: "Accepted successfully",
        data: notifications,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  getConnectionByNoti: async (req, res) => {
    try {
      const notifications = await Connection.findById(
        req.params.noti_id,
      )
        .populate("packagerid travellerid", "-password").populate('travelPlan packagePlan')
        .sort({ createdAt: -1 });
      if (req.query.notify && req.query.notify === 'true') {

        const content = `${notifications.packagerid.fullName} is requesting delivery of ${notifications.packagePlan.name} to ${notifications.packagePlan.delivery_address}.`
        await Notification.create({
          userType: req.user.type,
          senderId: req.user.id,
          receverId: notifications.travellerid._id,
          travelPlan: notifications.travelPlan._id,
          packagePlan: notifications.packagePlan._id,
          notification: content,
          connection: notifications._id,
          status: 'NORMAL'
        })
        await notify({ to: notifications.travellerid._id, content: content })
      }
      // if (notifications.length > 0) {
      const data = {
        ...notifications._doc,
        packagerid: {
          ...notifications._doc.packagerid._doc,
          rating: await getReview(notifications.packagerid?._id),
        },
        travellerid: {
          ...notifications._doc.travellerid._doc,
          rating: await getReview(notifications.travellerid?._id),
        },
      };
      res.status(200).json({
        success: true,
        message: "Fetched ",
        data: data,
      });
      // const newData = notifications.map((item) => {});
      // } else {
      //   res.status(200).json({
      //     success: true,
      //     message: "Fetched notification successfully",
      //     data: notifications,
      //   });
      // }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  getConnectionHistory: async (req, res) => {
    try {
      console.log("sdadssa", req.user);
      if (req && req.user && req.user.type == "ADMIN") {
        //How this line is working need to ask from chetan
        const notifications = await Connection.find({
          delivery_date: { $lt: new Date().getTime() },
        });

        res.status(200).json({
          success: true,
          message: "Fetched all history successfully",
          data: notifications,
        });
      } else {
        let cond = {
          finaldeliveryDate: { $lt: new Date().getTime() }
          // $or: [
          //   { finaldeliveryDate: { $exists: false }, delivery_date: { $lt: new Date().getTime() } },
          //   { finaldeliveryDate: { $lt: new Date().getTime() } }
          // ]
        }
        if (req.user.type === "USER") {
          cond.packagerid = req.user.id;
        } else {
          cond.travellerid = req.user.id;
        }
        // {
        //   delivery_date: { $lt: new Date().getTime() },
        //   $or: [{ packagerid: req.user.id }, { travellerid: req.user.id }],
        // }
        const notifications = await Connection.find(cond).populate(
          "packagerid travellerid",
          "-password"
        ).populate('travelPlan packagePlan').sort({ updatedAt: -1 });
        let newData = [];
        await Promise.all(
          notifications.map(async (item, i) => {
            const packageview = await Review.findOne({
              user: item.packagerid._id,
              posted_by: item.travellerid._id,
            });
            const travellerview = await Review.findOne({
              posted_by: item.packagerid._id,
              user: item.travellerid._id,
            });
            const data = {
              ...item._doc,
              packagerid: {
                ...item._doc.packagerid._doc,
                rating: 0,
              },
              travellerid: {
                ...item._doc.travellerid._doc,
                rating: 0,
              },
            };

            if (packageview) {
              data.packagerid = {
                ...item._doc.packagerid._doc,
                rating: packageview.rating,
              };
            }

            if (travellerview) {
              data.travellerid = {
                ...item._doc.travellerid._doc,
                rating: travellerview.rating,
              };
            }

            newData.push(data);
          })
        );

        res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          data: newData,
        });
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  createChat: async (req, res) => {
    try {
      const payload = req?.body || {};
      payload.sender = req.user.id;
      payload.userType = req.user.type;
      const chat = new Chat(payload);
      const currentchat = await chat.save();

      // const getAllChat = await Chat.find({
      //   sender: payload.sender,
      //   receiver: payload.receiver,
      // });
      //  socket.on("getAllMessage", () => {
      // Socket.emit("messages", getAllChat);
      res.status(200).json({
        success: true,
        message: "message sent successfully",
      });
      // });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  getChat: async (req, res) => {
    try {
      const payload = req?.body || {};

      const getAllChat = await Chat.find({
        connection: payload.connection,
        sender: {
          $in: [
            mongoose.Types.ObjectId(req.user.id),
            mongoose.Types.ObjectId(payload.receiver),
          ],
        },
        receiver: {
          $in: [
            mongoose.Types.ObjectId(payload.receiver),
            mongoose.Types.ObjectId(req.user.id),
          ],
        },
      })
        .populate("sender receiver", "-password").populate('connection')
        .sort({ createdAt: -1 });
      //  socket.on("getAllMessage", () => {
      // Socket.emit("messages", getAllChat);
      res.status(200).json({
        success: true,
        message: "message sent successfully",
        data: getAllChat,
      });
      // });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },


  checkuserConnection: async (req, res) => {
    try {
      const connection = await Connection.find({ status: { $in: ["ACCEPTED", "PICKUP", "PICUPED", "DELIVER"] }, $or: [{ travellerid: req.user.id }, { packagerid: req.user.id }] })
      const travellerplan = await TravelPlan.find({ active: true, user: req.user.id, estimate_time: { $gte: new Date() } })
      const packageplan = await PackagePlan.find({ active: true, user: req.user.id, jobStatus: { $nin: ["PENDING", "REJECTED", "DELIVERED", "REVOKE"] } })
      const plans = [...connection, ...travellerplan, ...packageplan]
      if (plans.length > 0) {
        return res.status(200).json({
          success: false,
          message: "Complete Travel plan/Package delivery to delete account.",
        });
      } else {
        await User.findByIdAndUpdate(req.user.id, {
          fullName: '',
          email: '',
          phone: '',
          code: '',
          password: '',
          idproof: '',
          profile: '',
          address: '',
          // verified: "",
          status: '',
          bank_details: '',
          // vault: 0,
          // wallet: 0,
          razorpay_contact_id: '',
          razorpay_bankaccount_id: '',
        })
        return res.status(200).json({
          success: true,
          message: "Account deleted successfully",
        });
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }



};
