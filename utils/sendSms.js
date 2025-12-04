const twilio = require("twilio");
const config = require("../config.json");

const client = twilio(config.TWILIO_SID, config.TWILIO_AUTH);

async function sendOtp(mobile, otp) {
  return client.messages.create({
    body: `Your Busybox Invoice OTP is ${otp}`,
    from: config.TWILIO_PHONE,
    to: `+91${mobile}`
  });
}

module.exports = { sendOtp };
