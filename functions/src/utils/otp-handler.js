/**
 * @fileoverview Secure OTP generation and management
 * @module utils/otp-handler
 */

const { db } = require("../../config/firebase-admin");

/**
 * Generate a cryptographically secure 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateSecureOTP() {
  // Use crypto for true randomness
  const crypto = require("crypto");
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number

  // Generate random bytes and convert to number
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);

  // Scale to 6-digit range
  const scaled = min + (randomNumber % (max - min + 1));
  return scaled.toString();
}

/**
 * Update invite document with new OTP
 * @param {string} inviteId Firestore invite document ID
 * @param {string} otp Generated OTP
 * @returns {Promise<Object>} Updated invite data
 */
async function updateInviteOTP(inviteId) {
  const inviteRef = db.collection("invites").doc(inviteId);
  const now = new Date();

  // Get current invite data
  const invite = await inviteRef.get();
  if (!invite.exists) {
    throw new Error("Invite not found");
  }

  const data = invite.data();
  const attempts = (data.otpAttempts || 0) + 1;

  // Check for max attempts (increased for testing)
  if (attempts > 20) {
    const lockoutTime = new Date(now.getTime() + 30 * 60000); // 30 minutes
    await inviteRef.update({
      otpLockoutUntil: lockoutTime,
    });
    throw new Error("Maximum OTP attempts exceeded. Try again in 30 minutes.");
  }

  // Generate and store new OTP
  const otp = generateSecureOTP();
  const expiresAt = new Date(now.getTime() + 15 * 60000); // 15 minutes

  await inviteRef.update({
    otp,
    otpExpiresAt: expiresAt,
    otpAttempts: attempts,
    otpCreatedAt: now,
  });

  // Return data needed for email/SMS (never log this)
  return {
    otp,
    expiresAt,
    attempts,
  };
}

module.exports = {
  updateInviteOTP,
};
