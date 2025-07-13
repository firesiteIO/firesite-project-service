const ValidationService = require("../validation");
const Joi = require("joi");

describe("ValidationService", () => {
  beforeEach(() => {
    // Clear all registries before each test
    ValidationService.schemas.clear();
    ValidationService.customRules.clear();
    ValidationService.constraints.clear();
  });

  describe("Schema Definition", () => {
    test("should successfully define and validate against a schema", async () => {
      // Define a test schema
      const userSchema = {
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().min(18),
      };

      ValidationService.defineSchema("users", userSchema);

      // Valid data
      const validData = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      };

      const result = await ValidationService.validateDocument(
        "users",
        validData
      );
      expect(result).toEqual(validData);
    });

    test("should reject invalid data", async () => {
      const userSchema = {
        name: Joi.string().required(),
        email: Joi.string().email().required(),
      };

      ValidationService.defineSchema("users", userSchema);

      // Invalid data (missing email)
      const invalidData = {
        name: "John Doe",
      };

      await expect(async () => {
        await ValidationService.validateDocument("users", invalidData);
      }).rejects.toThrow();
    });
  });

  describe("Custom Rules", () => {
    test("should apply custom validation rules", async () => {
      // Define basic schema
      const productSchema = {
        name: Joi.string().required(),
        price: Joi.number().required(),
      };

      // Define custom rule
      const customRules = {
        price: async (price, data) => {
          if (price <= 0) {
            throw new Error("Price must be positive");
          }
        },
      };

      ValidationService.defineSchema("products", productSchema);
      ValidationService.addCustomRules("products", customRules);

      // Test valid data
      const validData = {
        name: "Product 1",
        price: 100,
      };

      const result = await ValidationService.validateDocument(
        "products",
        validData
      );
      expect(result).toEqual(validData);

      // Test invalid data
      const invalidData = {
        name: "Product 2",
        price: -50,
      };

      await expect(async () => {
        await ValidationService.validateDocument("products", invalidData);
      }).rejects.toThrow("Price must be positive");
    });
  });

  describe("Constraints", () => {
    test("should validate field dependencies", async () => {
      const orderSchema = {
        type: Joi.string().required(),
        cardNumber: Joi.string(),
        expiryDate: Joi.string(),
      };

      const constraints = {
        cardNumber: {
          dependencies: ["expiryDate"],
        },
      };

      ValidationService.defineSchema("orders", orderSchema);
      ValidationService.enforceConstraints("orders", constraints);

      // Valid data (both fields present)
      const validData = {
        type: "credit",
        cardNumber: "4111111111111111",
        expiryDate: "12/25",
      };

      const result = await ValidationService.validateDocument(
        "orders",
        validData
      );
      expect(result).toEqual(validData);

      // Invalid data (missing dependency)
      const invalidData = {
        type: "credit",
        cardNumber: "4111111111111111",
      };

      await expect(async () => {
        await ValidationService.validateDocument("orders", invalidData);
      }).rejects.toThrow(
        'Field "cardNumber" requires "expiryDate" to be present'
      );
    });
  });

  describe("Error Formatting", () => {
    test("should format validation errors correctly", async () => {
      const schema = {
        name: Joi.string().required(),
        age: Joi.number().required(),
      };

      ValidationService.defineSchema("users", schema);

      try {
        await ValidationService.validateDocument("users", { name: "Test" });
      } catch (error) {
        expect(error).toHaveProperty("message");
        expect(error).toHaveProperty("details");
        expect(error).toHaveProperty("path");
        expect(error).toHaveProperty("type");
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle undefined collection", async () => {
      await expect(async () => {
        await ValidationService.validateDocument("nonexistent", {});
      }).rejects.toThrow("No schema registered for collection");
    });

    test("should handle empty data", async () => {
      const schema = {
        name: Joi.string().required(),
      };

      ValidationService.defineSchema("test", schema);

      await expect(async () => {
        await ValidationService.validateDocument("test", {});
      }).rejects.toThrow();
    });

    test("should strip unknown fields when configured", async () => {
      const schema = {
        name: Joi.string().required(),
      };

      ValidationService.defineSchema("test", schema, {
        stripUnknown: true,
      });

      const result = await ValidationService.validateDocument("test", {
        name: "Test",
        unknown: "field",
      });

      expect(result).toEqual({ name: "Test" });
      expect(result.unknown).toBeUndefined();
    });
  });
});
