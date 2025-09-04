
const mongoose = require("mongoose");
const Verification = mongoose.model("Verification");
const twilio = require("twilio");
const { getDatewithAddedMinutes } = require("../helper/user");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const otpExpiration = 1440  //in min


async function sendTwilioSms(to, text) {
  console.log("tooooooooooo=>", to);
  const client = new twilio(accountSid, authToken);
  await client.messages
    .create({
      body: text,
      to,
      from: "SK",
    })
    .then((message) => console.log(message.sid));
}

module.exports = {
  sendOtp: async (phone) => {

    let ver = await Verification.findOne({ phone });
    let ran_otp = Math.floor(1000 + Math.random() * 9000);
    console.log(ver)
    if (!ver) {
      ver = new Verification({
        phone: phone,
        otp: ran_otp,
        expiration_at: getDatewithAddedMinutes(otpExpiration),
      });
      await ver.save();
      const t = `Your verification code is: ${ran_otp}`;
      console.log(t)
      await sendTwilioSms(phone, t);
    } else {
      if (new Date().getTime() > new Date(ver.expiration_at).getTime()) {
        await Verification.findOneAndUpdate(
          { phone },
          {
            otp: ran_otp,
            verified: false,
            expiration_at: getDatewithAddedMinutes(otpExpiration),
          }
        );
        const t = `Your verification code is: ${ran_otp}`;
        await sendTwilioSms(phone, t);
      } else {
        const vv = await Verification.findOneAndUpdate(
          { phone },
          {
            otp: ran_otp,
            verified: false,
            expiration_at: getDatewithAddedMinutes(otpExpiration),
          }
        );
        const t = `Your verification code is: ${ran_otp}`;
        await sendTwilioSms(phone, t);
      }
    }

    // await sendTwilioSms(`91${phone}`, t);
  },
};
