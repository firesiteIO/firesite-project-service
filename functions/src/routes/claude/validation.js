/**
 * @fileoverview Validation for Claude API requests
 * @module routes/claude/claude.validation
 */

const Joi = require("joi");

/**
 * Middleware to validate chat request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateChat = (req, res, next) => {
  const schema = Joi.object({
    message: Joi.string().required(),
    conversationId: Joi.string().optional(),
    stream: Joi.boolean().optional(),
    model: Joi.string().optional(), // Allow model field
    context: Joi.object({
      currentProject: Joi.string().allow("").optional(),
      currentFile: Joi.string().allow("").optional(),
      promptRole: Joi.string().optional(),
      directory: Joi.string().optional(),
    }).optional(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: "Validation error",
      details: error.details[0].message,
    });
  }

  next();
};

/**
 * Middleware to validate command execution request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateExecute = (req, res, next) => {
  const schema = Joi.object({
    command: Joi.string().required(),
    model: Joi.string().optional(), // Allow model field
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: "Validation error",
      details: error.details[0].message,
    });
  }

  next();
};

/**
 * Middleware to validate file read request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateFile = (req, res, next) => {
  const schema = Joi.object({
    filePath: Joi.string().required(),
    model: Joi.string().optional(), // Allow model field
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: "Validation error",
      details: error.details[0].message,
    });
  }

  next();
};

/**
 * Middleware to validate list files request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateListFiles = (req, res, next) => {
  const schema = Joi.object({
    directory: Joi.string().required(),
    model: Joi.string().optional(), // Allow model field
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: "Validation error",
      details: error.details[0].message,
    });
  }

  next();
};
