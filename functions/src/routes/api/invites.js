/**
 * @fileoverview Basic invitation checking route
 * @module routes/api/invites
 */

const express = require("express");
const router = express.Router();
const { db } = require("../../../config/firebase-admin");
const { handleError } = require("../../utils/error-handler");
const { formatTimeUTC6 } = require("../../utils/time-formatter");

/**
 * Check if an email has a valid invitation
 * @route POST /api/invites/check
 * @returns {object} Test response
 */
router.post("/check", async (req, res) => {
  try {
    const { email, confirmEmail } = req.body;

    // Basic email presence check
    if (!email) {
      return handleError(400, "Email is required", req, res);
    }

    // Only check confirmation if it's provided
    if (confirmEmail && email !== confirmEmail) {
      return handleError(400, "Email addresses do not match", req, res);
    }

    // Query for active invitations
    const invitesRef = db.collection("invites");
    const snapshot = await invitesRef
      .where("invitedEmail", "==", email)
      .where("status", "in", ["pending", "email_verified"])
      .get();

    if (snapshot.empty) {
      return res.json({
        success: false,
        hasInvite: false,
        message: "No active invitation found for this email",
      });
    }

    // Get the most recent invitation if multiple exist
    const invites = [];
    snapshot.forEach((doc) => {
      invites.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by invitedAt descending
    const mostRecentInvite = invites.sort(
      (a, b) => b.invitedAt.toMillis() - a.invitedAt.toMillis()
    )[0];

    // Check resend limits
    const now = new Date();
    const resendAttempts = mostRecentInvite.resendAttempts || 0;
    const resendLockoutUntil = mostRecentInvite.resendLockoutUntil?.toDate();

    if (resendLockoutUntil && resendLockoutUntil > now) {
      // Set 15 minute lockout and reset lockout
      const lockoutUntil = new Date(now.getTime() + 15 * 60000);
      await invitesRef.doc(mostRecentInvite.id).update({
        resendLockoutUntil: lockoutUntil,
      });

      // Format time in US Central Time (UTC-6)
      const formattedTime = formatTimeUTC6(resendLockoutUntil);

      return handleError(
        429,
        `Too many resend attempts. Please try again after ${formattedTime}`,
        req,
        res
      );
    }

    if (resendAttempts >= 20) {
      // Set 15 minute lockout
      const lockoutUntil = new Date(now.getTime() + 15 * 60000);
      await invitesRef.doc(mostRecentInvite.id).update({
        resendLockoutUntil: lockoutUntil,
        resendAttempts: 2,
      });

      // Format time in US Central Time (UTC-6)
      const formattedTime = formatTimeUTC6(lockoutUntil);

      return handleError(
        429,
        `Maximum resend attempts reached. Please try again after ${formattedTime}`,
        req,
        res
      );
    }

    // Automatically send OTP email when invite is found
    const { updateInviteOTP } = require("../../utils/otp-handler");
    const { sendOTPEmail } = require("../../services/email");

    try {
      // Generate and store new OTP
      const { otp, expiresAt } = await updateInviteOTP(mostRecentInvite.id);

      // Send OTP email
      await sendOTPEmail({
        to: email,
        otp,
        fname: mostRecentInvite.inviterName || "there",
      });

      // Update resend attempts
      await invitesRef.doc(mostRecentInvite.id).update({
        resendAttempts: resendAttempts + 1,
        lastResendAt: now,
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      return handleError(500, "Failed to send verification code", req, res);
    }

    return res.json({
      success: true,
      hasInvite: true,
      message: "Invitation found and verification code sent successfully",
      invite: {
        id: mostRecentInvite.id,
        productId: mostRecentInvite.productId,
        inviterName: mostRecentInvite.inviterName,
        invitedAt: mostRecentInvite.invitedAt,
        inviteQuota: mostRecentInvite.inviteQuota || 0,
        remainingInvites: mostRecentInvite.remainingInvites || 0,
        resendAttempts: resendAttempts + 1,
        maxResendAttempts: 3,
      },
    });
  } catch (error) {
    console.error("Error checking invitation:", error);
    return handleError(500, "Error checking invitation status", req, res);
  }
});

/**
 * Create a test invitation
 * @route POST /api/invites/create
 * @returns {object} Created invitation details
 */
router.post("/create", async (req, res) => {
  try {
    const {
      email,
      productId = "test-product",
      inviterName = "Test Inviter",
      inviterEmail = "inviter@test.com",
    } = req.body;

    if (!email) {
      console.log("No email provided in request");
      return handleError(400, "Email is required", req, res);
    }

    // Create the invitation document
    const inviteData = {
      invitedEmail: email,
      productId,
      inviterName,
      inviterEmail,
      status: "pending",
      invitedAt: new Date(),
      inviteQuota: 3,
      remainingInvites: 3,
      otpAttempts: 0,
      lastAttempt: null,
      otpLockoutUntil: null,
    };

    console.log("Creating invite with data:", inviteData);
    const docRef = await db.collection("invites").add(inviteData);
    console.log("Invite created with ID:", docRef.id);

    return res.json({
      success: true,
      message: "Invitation created successfully",
      id: docRef.id,
      invite: inviteData,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return handleError(500, "Error creating invitation", req, res);
  }
});

/**
 * Validate invitation code
 * @route POST /api/invites/validate
 * @returns {object} Validation result
 */
router.post("/validate", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return handleError(400, "Email and code are required", req, res);
    }

    // Query for the invitation
    const invitesRef = db.collection("invites");
    const snapshot = await invitesRef
      .where("invitedEmail", "==", email)
      .where("status", "in", ["pending", "email_verified"])
      .get();

    if (snapshot.empty) {
      return handleError(404, "No pending invitation found", req, res);
    }

    // Get the most recent invitation
    const invites = [];
    snapshot.forEach((doc) => {
      invites.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const invite = invites.sort(
      (a, b) => b.invitedAt.toMillis() - a.invitedAt.toMillis()
    )[0];

    // Validate the code
    if (invite.valCode !== code) {
      return res.json({
        success: false,
        message: "Invalid validation code",
      });
    }

    // Update the invitation status
    await invitesRef.doc(invite.id).update({
      status: "validated",
      validatedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Code validated successfully",
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return handleError(500, "Error validating invitation", req, res);
  }
});

// Add a resend endpoint for explicit resend requests
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return handleError(400, "Email is required", req, res);
    }

    // Find the most recent invite
    const invitesRef = db.collection("invites");
    const snapshot = await invitesRef
      .where("invitedEmail", "==", email)
      .where("status", "in", ["pending", "email_verified"])
      .get();

    if (snapshot.empty) {
      return handleError(404, "No pending invitation found", req, res);
    }

    const invites = [];
    snapshot.forEach((doc) => {
      invites.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const mostRecentInvite = invites.sort(
      (a, b) => b.invitedAt.toMillis() - a.invitedAt.toMillis()
    )[0];

    // Check resend limits
    const now = new Date();
    const resendAttempts = mostRecentInvite.resendAttempts || 0;
    const lastResendAt = mostRecentInvite.lastResendAt?.toDate();
    const resendLockoutUntil = mostRecentInvite.resendLockoutUntil?.toDate();

    if (resendLockoutUntil && resendLockoutUntil > now) {
      // Format time in US Central Time (UTC-6)
      const formattedTime = formatTimeUTC6(resendLockoutUntil);

      return handleError(
        429,
        `Too many resend attempts. Please try again after ${formattedTime}`,
        req,
        res
      );
    }

    if (lastResendAt && now.getTime() - lastResendAt.getTime() < 60000) {
      return handleError(
        429,
        "Please wait 1 minute between resend attempts",
        req,
        res
      );
    }

    if (resendAttempts >= 3) {
      const lockoutUntil = new Date(now.getTime() + 15 * 60000);
      await invitesRef.doc(mostRecentInvite.id).update({
        resendLockoutUntil: lockoutUntil,
        resendAttempts: resendAttempts - 1,
      });

      // Format time in US Central Time (UTC-6)
      const formattedTime = formatTimeUTC6(lockoutUntil);

      return handleError(
        429,
        `Maximum resend attempts reached. Please try again after ${formattedTime}`,
        req,
        res
      );
    }

    // Generate and send new OTP
    const { updateInviteOTP } = require("../../utils/otp-handler");
    const { sendOTPEmail } = require("../../services/email");

    const { otp, expiresAt } = await updateInviteOTP(mostRecentInvite.id);
    await sendOTPEmail({
      to: email,
      otp,
      fname: mostRecentInvite.inviterName || "there",
    });

    // Update resend attempts
    await invitesRef.doc(mostRecentInvite.id).update({
      resendAttempts: resendAttempts + 1,
      lastResendAt: now,
    });

    return res.json({
      success: true,
      message: "Verification code resent",
      resendAttempts: resendAttempts + 1,
      maxResendAttempts: 3,
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return handleError(500, "Error resending verification code", req, res);
  }
});

/**
 * Update invitation data
 * @route POST /api/invites/:id/update
 * @returns {object} Update result
 */
router.post("/:id/update", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return handleError(400, "Invite ID is required", req, res);
    }

    // Get the invite document
    const inviteRef = db.collection("invites").doc(id);
    const invite = await inviteRef.get();

    if (!invite.exists) {
      return handleError(404, "Invitation not found", req, res);
    }

    // Update the invite document
    await inviteRef.update({
      ...updateData,
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Invitation updated successfully",
    });
  } catch (error) {
    return handleError(500, "Error updating invitation", req, res);
  }
});

module.exports = router;
