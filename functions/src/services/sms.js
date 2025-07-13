/**
 * @fileoverview SMS service using Twilio
 * @module services/sms
 */

const twilio = require("twilio");

// Initialize Twilio client with credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_FROM_PHONE;

console.log("=== Twilio Configuration ===");
console.log("Account SID exists:", !!accountSid);
console.log("Auth Token exists:", !!authToken);
console.log("Twilio Number:", twilioNumber);

// Validate required configuration
if (!accountSid || !authToken || !twilioNumber) {
  console.error("Missing required Twilio configuration:", {
    accountSid: !!accountSid,
    authToken: !!authToken,
    twilioNumber: !!twilioNumber,
  });
  throw new Error(
    "Incomplete Twilio configuration. Please check environment variables."
  );
}

const client = new twilio(accountSid, authToken);

/**
 * Send an OTP via SMS using Twilio
 * @param {Object} options SMS options
 * @param {string} options.to Recipient phone number
 * @param {string} options.otp One-time password
 * @returns {Promise<boolean>} Success status
 */
async function sendOTPSms({ to, otp }) {
  try {
    if (!twilioNumber) {
      throw new Error(
        "Twilio phone number not configured. Please set TWILIO_FROM_PHONE environment variable."
      );
    }

    console.log("\n=== Sending SMS ===");
    console.log("Input phone:", to);
    console.log("OTP:", otp);

    // Format phone number to E.164 format for Twilio
    const formattedPhone = to.replace(/\D/g, "");
    const e164Phone = `+1${formattedPhone}`; // Assuming US numbers for now
    console.log("Formatted phone:", e164Phone);
    console.log("Using Twilio number:", twilioNumber);

    // Log message parameters
    const messageParams = {
      body: `Your Firesite.ai verification code is: ${otp}. This code will expire in 15 minutes.`,
      to: e164Phone,
      from: twilioNumber,
    };
    console.log("Message parameters:", messageParams);

    // Send SMS via Twilio
    const message = await client.messages.create(messageParams);
    console.log("Message sent successfully:", message.sid);

    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      status: error.status,
      moreInfo: error.moreInfo,
    });
    throw error;
  }
}

module.exports = {
  sendOTPSms,
};
