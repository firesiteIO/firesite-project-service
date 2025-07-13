/**
 * @fileoverview Email service using SendGrid
 * @module services/email
 */

const sendGridEmail = require("@sendgrid/mail");
const sendGridClient = require("@sendgrid/client");
const { handleError } = require("../utils/error-handler");

// Initialize SendGrid with API key
sendGridEmail.setApiKey(process.env.SENDGRID_API_KEY);
sendGridClient.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Email template configuration
 * @typedef {Object} Template
 * @property {string} id - SendGrid template ID
 * @property {string} name - Template name
 * @property {string} description - Template description
 * @property {string[]} requiredVars - Required template variables
 * @property {string} subject - Default subject line
 */

/**
 * Email template definitions
 * Organized by category for easy management
 */
const TEMPLATES = {
  // Authentication related emails
  AUTH: {
    INVITE_CODE: {
      id: "d-7c6ae5337d8d4dae9de0c5fcbba8659f",
      name: "Firesite Invitation Code",
      description: "Send OTP code for email verification",
      requiredVars: ["valcode", "email", "fname"],
      subject: "Firesite.io - Validate your email",
    },
    WELCOME: {
      id: null, // Add ID when available
      name: "Welcome to Firesite",
      description: "Welcome new users after registration",
      requiredVars: ["firstName", "email"],
      subject: "Welcome to Firesite.io",
    },
    PASSWORD_RESET: {
      id: null, // Add ID when available
      name: "Password Reset",
      description: "Send password reset link",
      requiredVars: ["resetLink", "email"],
      subject: "Firesite.io - Password Reset Request",
    },
  },

  // Notification emails
  NOTIFICATIONS: {
    ACCOUNT_UPDATE: {
      id: null, // Add ID when available
      name: "Account Update",
      description: "Notify users of account changes",
      requiredVars: ["updateType", "email"],
      subject: "Firesite.io - Account Update",
    },
  },

  // Marketing emails
  MARKETING: {
    NEWSLETTER: {
      id: null, // Add ID when available
      name: "Monthly Newsletter",
      description: "Monthly updates and news",
      requiredVars: ["email"],
      subject: "Firesite.io Newsletter",
    },
  },
};

/**
 * Validate required template variables
 * @param {Object} template Template configuration
 * @param {Object} data Template variables
 * @throws {Error} If required variables are missing
 */
function validateTemplateVars(template, data) {
  const missing = template.requiredVars.filter(
    (varName) => !data.hasOwnProperty(varName)
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required template variables: ${missing.join(", ")}`
    );
  }
}

/**
 * Send an email using a template
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {Object} options.template Template configuration
 * @param {Object} options.data Template variables
 * @param {string} [options.subject] Optional subject override
 * @returns {Promise<boolean>} Success status
 */
async function sendTemplateEmail({ to, template, data, subject }) {
  try {
    // Validate template variables
    validateTemplateVars(template, data);

    const msg = {
      to,
      from: "Firesite Accounts <support@firesite.io>",
      templateId: template.id,
      subject: subject || template.subject,
      dynamicTemplateData: data,
    };

    await sendGridEmail.send(msg);
    return true;
  } catch (error) {
    console.error("SendGrid error:", error);
    throw error;
  }
}

/**
 * Send an OTP email using SendGrid
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.otp One-time password
 * @param {string} options.fname First name
 * @returns {Promise<boolean>} Success status
 */
async function sendOTPEmail({ to, otp, fname }) {
  return sendTemplateEmail({
    to,
    template: TEMPLATES.AUTH.INVITE_CODE,
    data: {
      valcode: otp,
      email: to,
      fname: fname || "there",
    },
  });
}

/**
 * Send notifications to filtered users in batches
 * Utility function for sending emails to users based on preferences or conditions
 *
 * @param {Object} options - Options for sending filtered notifications
 * @param {FirebaseFirestore.Firestore} options.db - Firestore instance
 * @param {string} options.collection - Collection to query (e.g., 'users')
 * @param {Object} options.filter - Firestore filter conditions (e.g., { emailNotifications: true })
 * @param {Function} options.emailFn - Function to call for each user (should return sendTemplateEmail options)
 * @param {number} [options.batchSize=10] - Size of batches for sending emails
 * @param {boolean} [options.continueOnError=true] - Whether to continue if some emails fail
 * @example
 * // Example usage for marketing emails:
 * await sendFilteredNotifications({
 *   db: admin.firestore(),
 *   collection: 'users',
 *   filter: {
 *     emailNotifications: true,
 *     marketingOptIn: true
 *   },
 *   emailFn: (user) => ({
 *     to: user.email,
 *     template: TEMPLATES.MARKETING.NEWSLETTER,
 *     data: { email: user.email }
 *   }),
 *   batchSize: 50
 * });
 */
async function sendFilteredNotifications({
  db,
  collection,
  filter,
  emailFn,
  batchSize = 10,
  continueOnError = true,
}) {
  try {
    // Build query with filters
    let query = db.collection(collection);
    Object.entries(filter).forEach(([field, value]) => {
      query = query.where(field, "==", value);
    });

    const snapshot = await query.get();

    // Batch users
    const batches = snapshot.docs.reduce((acc, doc, i) => {
      const batchIndex = Math.floor(i / batchSize);
      if (!acc[batchIndex]) {
        acc[batchIndex] = [];
      }
      acc[batchIndex].push(doc.data());
      return acc;
    }, []);

    // Process batches
    for (const batch of batches) {
      try {
        await Promise.all(
          batch.map(async (user) => {
            const emailOptions = emailFn(user);
            return sendTemplateEmail(emailOptions);
          })
        );
      } catch (error) {
        console.error("Error sending batch:", error);
        if (!continueOnError) throw error;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in filtered notifications:", error);
    throw error;
  }
}

/**
 * Add contacts to SendGrid marketing lists
 * @param {Object} options Contact options
 * @param {Array<Object>} options.contacts Array of contact objects to add
 * @param {string} options.contacts[].email Contact's email address
 * @param {string} [options.contacts[].first_name] Contact's first name
 * @param {string} [options.contacts[].last_name] Contact's last name
 * @param {Object} [options.contacts[].custom_fields] Custom fields for the contact
 * @param {Array<string>} [options.listIds] Array of SendGrid list IDs to add contacts to
 * @returns {Promise<Object>} SendGrid API response
 * @example
 * // Example usage:
 * await addContacts({
 *   contacts: [{
 *     email: 'user@example.com',
 *     first_name: 'John',
 *     last_name: 'Doe',
 *     custom_fields: {
 *       e1_T: 'Premium' // custom field for subscription tier
 *     }
 *   }],
 *   listIds: ['your-list-id-here']
 * });
 */
async function addContacts({ contacts, listIds = [] }) {
  try {
    const request = {
      method: "PUT",
      url: "/v3/marketing/contacts",
      body: {
        contacts: contacts,
        list_ids: listIds,
      },
    };

    const [response, body] = await sendGridClient.request(request);

    if (response.statusCode >= 400) {
      throw new Error(
        `SendGrid API error: ${response.statusCode} - ${JSON.stringify(body)}`
      );
    }

    return body;
  } catch (error) {
    console.error("Error adding contacts to SendGrid:", error);
    throw error;
  }
}

module.exports = {
  TEMPLATES,
  sendTemplateEmail,
  sendOTPEmail,
  sendFilteredNotifications,
  addContacts,
};
