/**
 * @fileoverview Email and phone verification routes
 * @module routes/api/verify
 *
 * Current implementation handles invite-based verification for:
 * - Email verification (updates emailValid)
 * - Phone verification (updates phoneValid)
 *
 * Future enhancements:
 * - Two-factor authentication for user accounts
 * - Email change verification for existing users
 * - Phone number change verification for existing users
 * - Recovery code generation and verification
 * - Backup phone/email verification
 */

const express = require("express");
const router = express.Router();
const { db } = require("../../../config/firebase-admin");
const { handleError } = require("../../utils/error-handler");
const { sendOTPEmail } = require("../../services/email");
const { sendOTPSms } = require("../../services/sms");
const { updateInviteOTP } = require("../../utils/otp-handler");
const createRateLimiter = require("../../middleware/rate-limit");

// Rate limiter for OTP attempts
const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // increased from 5 to 20 for testing
});

/**
 * Send email verification OTP
 * @route POST /verify/email/send
 */
router.post("/email/send", otpLimiter, async (req, res) => {
  try {
    const { email, inviteId } = req.body;
    console.log("=== Send Email OTP Request ===");
    console.log("Email:", email);
    console.log("Invite ID:", inviteId);

    if (!email || !inviteId) {
      return handleError(400, "Email and invite ID are required", req, res);
    }

    // Update invite with new OTP
    const { otp, expiresAt } = await updateInviteOTP(inviteId);

    // Send OTP email (only place where OTP is used)
    await sendOTPEmail({
      to: email,
      otp,
      fname: "there", // We'll update this when we have the name
    });

    // Note: Never send OTP in response
    return res.json({
      success: true,
      message: "Verification code sent",
      expiresAt,
    });
  } catch (error) {
    console.error("Error sending email OTP:", error.message);
    return handleError(500, error.message, req, res);
  }
});

/**
 * Verify email OTP
 * @route POST /verify/email
 */
router.post("/email", otpLimiter, async (req, res) => {
  try {
    const { email, code, inviteId } = req.body;
    console.log("=== Verify Email OTP Request ===");
    console.log("Email:", email);
    console.log("Invite ID:", inviteId);

    if (!email || !code || !inviteId) {
      return handleError(
        400,
        "Email, code, and invite ID are required",
        req,
        res
      );
    }

    // Get invite document
    const inviteRef = db.collection("invites").doc(inviteId);
    const invite = await inviteRef.get();

    if (!invite.exists) {
      return handleError(404, "Invite not found", req, res);
    }

    const data = invite.data();

    // Check lockout
    if (data.otpLockoutUntil && data.otpLockoutUntil.toDate() > new Date()) {
      return handleError(
        429,
        "Account is temporarily locked. Try again later",
        req,
        res
      );
    }

    // Check expiration
    if (data.otpExpiresAt.toDate() < new Date()) {
      return handleError(400, "Verification code has expired", req, res);
    }

    // Verify code
    if (data.otp !== code) {
      // Increment attempts and potentially lock account
      const attempts = (data.verifyAttempts || 0) + 1;
      const updates = { verifyAttempts: attempts };

      if (attempts >= 3) {
        const lockoutTime = new Date(Date.now() + 30 * 60000); // 30 minutes
        updates.otpLockoutUntil = lockoutTime;
      }

      await inviteRef.update(updates);
      return handleError(400, "Invalid verification code", req, res);
    }

    // Mark as verified and clean up
    await inviteRef.update({
      emailValid: true,
      emailVerifiedAt: new Date(),
      status: "email_verified",
      otp: null,
      verifyAttempts: 0,
      otpLockoutUntil: null,
    });

    return res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying email:", error.message);
    return handleError(500, error.message, req, res);
  }
});

/**
 * Send phone verification OTP
 * @route POST /verify/phone/send
 */
router.post("/phone/send", otpLimiter, async (req, res) => {
  try {
    const { phone, inviteId } = req.body;
    console.log("=== Send Phone OTP Request ===");
    console.log("Phone:", phone);
    console.log("Invite ID:", inviteId);

    if (!phone || !inviteId) {
      return handleError(400, "Phone and invite ID are required", req, res);
    }

    // Update invite with new OTP
    const { otp, expiresAt } = await updateInviteOTP(inviteId);

    // Send OTP via SMS
    await sendOTPSms({ to: phone, otp });

    return res.json({
      success: true,
      message: "Verification code sent",
      expiresAt,
    });
  } catch (error) {
    console.error("Error sending phone OTP:", error.message);
    return handleError(500, error.message, req, res);
  }
});

/**
 * Verify phone OTP
 * @route POST /verify/phone
 */
router.post("/phone", otpLimiter, async (req, res) => {
  try {
    const { phone, code, inviteId } = req.body;
    console.log("=== Verify Phone OTP Request ===");
    console.log("Phone:", phone);
    console.log("Invite ID:", inviteId);

    if (!phone || !code || !inviteId) {
      return handleError(
        400,
        "Phone, code, and invite ID are required",
        req,
        res
      );
    }

    // Get invite document
    const inviteRef = db.collection("invites").doc(inviteId);
    const invite = await inviteRef.get();

    if (!invite.exists) {
      return handleError(404, "Invite not found", req, res);
    }

    const data = invite.data();

    // Check lockout
    if (data.otpLockoutUntil && data.otpLockoutUntil.toDate() > new Date()) {
      return handleError(
        429,
        "Account is temporarily locked. Try again later",
        req,
        res
      );
    }

    // Check expiration
    if (data.otpExpiresAt.toDate() < new Date()) {
      return handleError(400, "Verification code has expired", req, res);
    }

    // Verify code
    if (data.otp !== code) {
      // Increment attempts and potentially lock account
      const attempts = (data.verifyAttempts || 0) + 1;
      const updates = { verifyAttempts: attempts };

      if (attempts >= 3) {
        const lockoutTime = new Date(Date.now() + 30 * 60000); // 30 minutes
        updates.otpLockoutUntil = lockoutTime;
      }

      await inviteRef.update(updates);
      return handleError(400, "Invalid verification code", req, res);
    }

    // Mark as verified and clean up
    await inviteRef.update({
      phoneValid: true,
      phoneVerifiedAt: new Date(),
      otp: null, // Remove OTP after successful verification
      verifyAttempts: 0,
      otpLockoutUntil: null,
    });

    return res.json({
      success: true,
      message: "Phone verified successfully",
    });
  } catch (error) {
    console.error("Error verifying phone:", error.message);
    return handleError(500, error.message, req, res);
  }
});

module.exports = router;
