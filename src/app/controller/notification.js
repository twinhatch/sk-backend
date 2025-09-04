const mongoose = require("mongoose");
const { notify } = require("../services/notification");
const Notification = mongoose.model("Notification");
const TravelPlan = mongoose.model("TravelPlan");
const PackagePlan = mongoose.model("PackagePlan");

module.exports = {
  createNotification: async (req, res) => {
    try {
      const payload = req?.body || {};
      payload.userType = req.user.type;
      payload.senderId = req.user.id;
      const getConn = await Notification.find({
        travelPlan: payload.travelPlan,
        packagePlan: payload.packagePlan,
      });

      if (getConn.length > 0) {
        return res.status(201).json({
          success: false,
          message: "Already sent invitation",
          connection: getConn[0],
        }); ``
      }
      const notifys = new Notification(payload);
      const noti = await notifys.save();
      const notifications = await Notification.findById(noti._id).populate('packagePlan travelPlan receverId senderId')
      let content = `${notifications.senderId.fullName} is trying to connect for delivering ${notifications.packagePlan.name} to ${notifications.packagePlan.delivery_address}`;

      await notify({
        to: notifications.receverId._id,
        content,
      })
      notifications.notification = content,
        await notifications.save();


      return res.status(201).json({
        success: true,
        message: "Data Saved successfully!",
        data: notifications,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  createNotificationFromAdmin: async (req, res) => {
    try {
      const payload = req?.body || {};
      const packageplan = await PackagePlan.findOne({ track_id: payload.packagePostId }).populate('user', 'fullName')
      const travellerPlan = await TravelPlan.findOne({ track_id: payload.travellerPostId })
      payload.userType = 'USER';
      payload.senderId = packageplan.user._id;
      payload.travelPlan = travellerPlan._id
      payload.packagePlan = packageplan._id
      payload.receverId = travellerPlan.user
      console.log(payload)
      payload.notification = `Earn ${packageplan.total} by delivering ${packageplan.name} to ${packageplan.delivery_address} for ${packageplan.user.fullName}`
      const getConn = await Notification.find({
        travelPlan: payload.travelPlan,
        packagePlan: payload.packagePlan,
      });

      if (getConn.length > 0) {
        return res.status(201).json({
          success: false,
          message: "Already sent invitation",
          connection: getConn[0],
        });
      }
      const notifys = new Notification(payload);
      const noti = await notifys.save();
      // const notifications = await Notification.findById(noti._id).populate('packagePlan travelPlan packagerid travellerid')
      await notify({
        to: noti.receverId,
        content: payload.notification,
      })


      return res.status(201).json({
        success: true,
        message: "Data Saved successfully!",
        data: noti,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },



  getNotification: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      console.log("sdadssa", req.user);
      if (req && req.user && req.user.type == "ADMIN") {
        //How this line is working need to ask from chetan
        console.log(req.query.id)
        const notifications = await Notification.find({
          receverId: req.query.id, //change for data
          userType: { $nin: ["USER"] }
        }).populate("senderId", "-password").populate('travelPlan packagePlan').sort({
          createdAt: -1,
        });

        res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          notificationList: notifications,
        });
      } else {
        const notifications = await Notification.find({
          receverId: req.user.id, //change for data
          // userType: { $ne: req.user.type },
          userType: { $nin: req.user.type === 'USER' ? [req.user.type] : [req.user.type, 'ADMIN'] }
        })
          .populate("senderId", "-password").populate('travelPlan packagePlan')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit)

        res.status(200).json({
          success: true,
          message: "Fetched all notification successfully",
          notificationList: notifications,
        });
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  getNotificationByID: async (req, res) => {
    try {
      const notifications = await Notification.findById(
        req?.params?.id
      ).populate("senderId", "-password").populate('travelPlan packagePlan');
      res.status(200).json({
        success: true,
        message: "Fetched all notification successfully",
        notification: notifications,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  deletenotification: async (req, res) => {
    try {
      // if (req) {
      //     if (req.body.notificationId) {
      //         const notificationID = req.body.notificationId;
      //         await Notification.deleteOne({ _id: notificationID });
      //         res.status(200).json({
      //             success: true,
      //             message: "Notification Deleted Successfuly!!",
      //         })
      //     } else {
      //         res.status(404).json({
      //             success: false,
      //             message: "Not found notificationId",
      //         })
      //     }
      // } else {
      await Notification.deleteMany({});
      res.status(200).json({
        success: true,
        message: "Notification Deleted Successfuly!!",
      });
      // }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  sedPushnotification: async (req, res) => {
    try {
      let payload = req.body;
      await notify({ content: payload.notification, to: payload.users });
      res
        .status(200)
        .json({ success: true, message: "Notification sent" });
    } catch (err) {
      console.log(err);
      res.status(400).json({ success: false, duplicate: false });
    }
  }
};
