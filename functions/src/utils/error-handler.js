/**
 * @fileoverview Error handling utilities
 * @module utils/error-handler
 */

/**
 * Error response mapping
 * @const {Object}
 */
const ERROR_TYPES = {
  400: {
    code: "400",
    title: "Bad Request",
    message: "The request could not be understood by the server.",
  },
  401: {
    code: "401",
    title: "Unauthorized",
    message: "Authentication is required to access this resource.",
  },
  403: {
    code: "403",
    title: "Forbidden",
    message: "You don't have permission to access this resource.",
  },
  404: {
    code: "404",
    title: "Not Found",
    message: "The requested resource could not be found.",
  },
  429: {
    code: "429",
    title: "Too Many Requests",
    message: "You have exceeded the rate limit. Please try again later.",
  },
  500: {
    code: "500",
    title: "Internal Server Error",
    message: "Something went wrong on our end. Please try again later.",
  },
  501: {
    code: "501",
    title: "Not Implemented",
    message: "Something went wrong on our end. Please try again later.",
  },
  502: {
    code: "502",
    title: "Bad Gateway",
    message: "Something went wrong on our end. Please try again later.",
  },
  503: {
    code: "503",
    title: "Service Unavailable",
    message: "Something went wrong on our end. Please try again later.",
  },
  504: {
    code: "504",
    title: "Gateway Timeout",
    message: "Something went wrong on our end. Please try again later.",
  },
};

/**
 * Error handler helper function
 * @param {number} code - HTTP status code
 * @param {Object|string} req - Express request object or custom error message
 * @param {Object} [res] - Express response object
 * @param {string} [message] - Custom error message (when req is request object)
 */
const handleError = (code, req, res, message) => {
  const errorType = ERROR_TYPES[code] || ERROR_TYPES[500];

  // Handle different parameter configurations
  let errorMessage = message;
  let responseObj = res;

  // If req is a string and no message, then req is the message
  if (typeof req === "string" && !message) {
    errorMessage = req;
  }

  // If req is an object with status and json methods, then it's the response
  if (req && typeof req === "object" && typeof req.status === "function") {
    responseObj = req;
    errorMessage = res; // In this case, res is actually the message
  }

  // If no valid response object, just log the error
  if (!responseObj || typeof responseObj.status !== "function") {
    console.error(`Error (${code}): ${errorMessage || errorType.message}`);
    return;
  }

  // Return JSON for API routes
  responseObj.status(code).json({
    error: errorType.title,
    message: errorMessage || errorType.message,
    code: code,
  });
};

module.exports = {
  ERROR_TYPES,
  handleError,
};
