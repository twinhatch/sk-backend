const OneSignal = require('@onesignal/node-onesignal');

// import * as OneSignal from '@onesignal/node-onesignal';

const mongoose = require("mongoose");
const Device = mongoose.model("Device");
const User = mongoose.model("User");
const Notification = mongoose.model("Notification");
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;

const app_key_provider = {
  getToken() {
    return process.env.ONESIGNAL_REST_API_KEY;
  },
};
const configuration = OneSignal.createConfiguration({
  appKey: process.env.ONESIGNAL_REST_API_KEY,
  // authMethods: {
  //   app_key: {
  //     tokenProvider: app_key_provider,
  //   },
  // },
});
// const configuration = OneSignal.createConfiguration({
//   // userKey: '<YOUR_USER_KEY_TOKEN>',
//   appKey: process.env.ONESIGNAL_REST_API_KEY,
// });
const client = new OneSignal.DefaultApi(configuration);

async function sendNotification(content, player_ids, data) {
  try {
    //   const user = await User.findById(user_id, { notification: 1 }).lean();
    //   console.log(user.notification);
    // if (!user.notification) return; // user's notification preference(wants to receive or not)
    const notification = new OneSignal.Notification();
    notification.app_id = ONESIGNAL_APP_ID;
    // notification.include_subscription_ids = player_ids;
    // notification.include_aliases = { "external_id": ["81fbcac63e81623a"] },
    notification.include_player_ids = player_ids;
    notification.contents = {
      en: content,
    };
    notification.name = "Traveller";
    // if (data) {
    //   notification.data = data;
    // }
    return await client.createNotification(notification);

  } catch (err) {
    console.log("error in send notification", content);
    console.error("error in send notification", err);
  }
}
async function findDevices(user) {
  const devices = await Device.find({ user });
  return devices.map((d) => d.player_id);
}

module.exports = {
  adminActivity: async ({ to, job, content }) => {
    const notObj = { for: to, message: content, job };
    await Notification.create(notObj);
  },
  push: async ({ to, from, content }, invite = null) => {
    if (from) {
      //   const user = await User.findById(from, { notify: 1 }).lean();
      //   console.log(user.notify);
      //   if (!user.notify) return; // admin choice of notification
    }
    const player_ids = await findDevices(to);
    // const notObj = { for: to, message: content };
    // if (invite) notObj.invited_for = invite;
    // await Notification.create(notObj);

    return sendNotification(content, player_ids, to);
  },
  notify: async ({ to, from, content, data }) => {
    const player_ids = await findDevices(to);
    return sendNotification(content, player_ids, data);
  },
};
