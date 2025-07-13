const { describe, it, expect, afterEach } = require("@jest/globals");
const { setTimeout } = require("timers");
const Joi = require("joi");
const { initializeApp, getApps } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const { getAuth, signInWithCustomToken } = require("firebase/auth");
const firestoreService = require("../src/services/firestore-advanced");
const validationService = require("../src/services/validation");

async function testFeatures(customToken) {
  try {
    console.log("Running tests with custom token:", customToken);

    // Initialize Firebase client
    if (!getApps().length) {
      const app = initializeApp({
        apiKey: process.env.FIREBASE_API_KEY,
        projectId: "firesite-ai-f3bc8",
        authDomain: "firesite-ai-f3bc8.firebaseapp.com",
      });

      // Initialize Auth and sign in
      const auth = getAuth(app);
      await signInWithCustomToken(auth, customToken);
    }

    // Initialize Firestore
    const db = getFirestore();
    firestoreService.initialize(db, customToken);

    // 1. Test data validation
    validationService.registerSchema("tests", {
      name: Joi.string().required(),
      value: Joi.number(),
    });

    // 2. Test document creation with metadata
    const doc = await firestoreService.createOrUpdate(
      "tests",
      "test1",
      {
        name: "Test Doc",
        value: 42,
      },
      customToken
    );
    console.log("Created document:", doc);

    // 3. Test batch operations
    console.log("\nTesting batch operations...");
    const batchResults = await firestoreService.executeBatch(
      [
        {
          type: "create",
          collection: "tests",
          docId: "batch1",
          data: {
            name: "Batch Doc 1",
            value: 100,
          },
        },
        {
          type: "create",
          collection: "tests",
          docId: "batch2",
          data: {
            name: "Batch Doc 2",
            value: 200,
          },
        },
        {
          type: "update",
          collection: "tests",
          docId: "test1",
          data: {
            value: 43,
          },
        },
      ],
      {
        continueOnError: true,
        progressCallback: (progress) => {
          console.log("Batch progress:", progress);
        },
      }
    );
    console.log("Batch results:", batchResults);

    // 4. Test transactions
    console.log("\nTesting transactions...");
    const transactionResult = await firestoreService.executeTransaction(
      async (txn) => {
        // Read current values
        const doc1 = await txn.get("tests", "test1");
        const doc2 = await txn.get("tests", "batch1");

        // Perform atomic updates
        await txn.update("tests", "test1", {
          value: doc1.value + 1,
          name: "Updated in Transaction",
        });

        await txn.update("tests", "batch1", {
          value: doc2.value + 10,
          name: "Also Updated in Transaction",
        });

        // Create a new document in the same transaction
        await txn.set("tests", "txn1", {
          name: "Created in Transaction",
          value: doc1.value + doc2.value,
        });

        return {
          doc1: doc1.value,
          doc2: doc2.value,
          sum: doc1.value + doc2.value,
        };
      },
      {
        maxAttempts: 5,
        timeout: 10000,
      }
    );
    console.log("Transaction results:", transactionResult);

    // 5. Test querying with proper index order
    const queryResult = await firestoreService.query("tests", {
      where: [["value", ">", 40]],
      orderBy: [
        ["value", "asc"],
        ["name", "asc"],
      ],
      limit: 10,
    });
    console.log("\nQuery results after all operations:", queryResult);

    // 6. Test aggregation queries
    console.log("\nTesting aggregation queries...");

    // Create test data for aggregation
    await firestoreService.executeBatch([
      {
        type: "create",
        collection: "tests",
        docId: "agg1",
        data: {
          category: "A",
          region: "West",
          value: 100,
          quantity: 5,
        },
      },
      {
        type: "create",
        collection: "tests",
        docId: "agg2",
        data: {
          category: "A",
          region: "East",
          value: 200,
          quantity: 3,
        },
      },
      {
        type: "create",
        collection: "tests",
        docId: "agg3",
        data: {
          category: "B",
          region: "West",
          value: 150,
          quantity: 4,
        },
      },
    ]);

    // Test simple aggregation
    const simpleAggregation = await firestoreService.aggregateQuery("tests", {
      aggregates: {
        totalValue: { field: "value", type: "sum" },
        avgValue: { field: "value", type: "avg" },
        maxValue: { field: "value", type: "max" },
        minValue: { field: "value", type: "min" },
      },
    });
    console.log("Simple aggregation results:", simpleAggregation);

    // Test grouped aggregation
    const groupedAggregation = await firestoreService.aggregateQuery("tests", {
      groupBy: ["category", "region"],
      aggregates: {
        totalValue: { field: "value", type: "sum" },
        avgQuantity: { field: "quantity", type: "avg" },
      },
      where: [["value", ">=", 100]],
      orderBy: [["value", "desc"]],
    });
    console.log("Grouped aggregation results:", groupedAggregation);

    // Test aggregation with filters
    const filteredAggregation = await firestoreService.aggregateQuery("tests", {
      aggregates: {
        totalQuantity: { field: "quantity", type: "sum" },
      },
      where: [
        ["category", "==", "A"],
        ["value", ">", 150],
      ],
    });
    console.log("Filtered aggregation results:", filteredAggregation);

    // 7. Test full-text search
    console.log("\nTesting full-text search...");

    // Create test data for text search
    await firestoreService.executeBatch([
      {
        type: "create",
        collection: "tests",
        docId: "search1",
        data: {
          title: "Introduction to Firebase",
          description:
            "Learn about Firebase and its features for web development",
          tags: ["firebase", "web", "development"],
        },
      },
      {
        type: "create",
        collection: "tests",
        docId: "search2",
        data: {
          title: "Advanced Firebase Development",
          description: "Deep dive into Firebase authentication and Firestore",
          tags: ["firebase", "auth", "firestore"],
        },
      },
      {
        type: "create",
        collection: "tests",
        docId: "search3",
        data: {
          title: "Web Development Best Practices",
          description:
            "Essential tips for modern web development and deployment",
          tags: ["web", "development", "best-practices"],
        },
      },
    ]);

    // Test exact match search
    const exactSearch = await firestoreService.fullTextSearch(
      "tests",
      {
        query: "Firebase authentication",
        fields: ["title", "description"],
        minScore: 0.3,
      },
      {
        fuzzyMatch: false,
        highlightMatches: true,
      }
    );
    console.log("Exact match search results:", exactSearch);

    // Test fuzzy search
    const fuzzySearch = await firestoreService.fullTextSearch(
      "tests",
      {
        query: "firbase auth", // Intentional typo
        fields: ["title", "description", "tags"],
        minScore: 0.2,
      },
      {
        fuzzyMatch: true,
        highlightMatches: true,
      }
    );
    console.log("Fuzzy search results:", fuzzySearch);

    // Test search with filters
    const filteredSearch = await firestoreService.fullTextSearch("tests", {
      query: "development",
      fields: ["title", "description"],
      where: [["tags", "array-contains", "web"]],
      minScore: 0.3,
    });
    console.log("Filtered search results:", filteredSearch);

    // Test case-sensitive search
    const caseSensitiveSearch = await firestoreService.fullTextSearch(
      "tests",
      {
        query: "Firebase",
        fields: ["title"],
        minScore: 0.5,
      },
      {
        caseSensitive: true,
        highlightMatches: true,
      }
    );
    console.log("Case-sensitive search results:", caseSensitiveSearch);

    // 8. Test graph queries
    console.log("\nTesting graph queries...");

    // Create test data for graph traversal
    await firestoreService.executeBatch([
      // Users
      {
        type: "create",
        collection: "users",
        docId: "user1",
        data: {
          name: "John Doe",
          friendIds: ["user2", "user3"],
          groupIds: ["group1"],
        },
      },
      {
        type: "create",
        collection: "users",
        docId: "user2",
        data: {
          name: "Jane Smith",
          friendIds: ["user1"],
          groupIds: ["group1", "group2"],
        },
      },
      {
        type: "create",
        collection: "users",
        docId: "user3",
        data: {
          name: "Bob Wilson",
          friendIds: ["user1"],
          groupIds: ["group2"],
        },
      },
      // Groups
      {
        type: "create",
        collection: "groups",
        docId: "group1",
        data: {
          name: "Development Team",
          projectIds: ["project1"],
        },
      },
      {
        type: "create",
        collection: "groups",
        docId: "group2",
        data: {
          name: "Design Team",
          projectIds: ["project2"],
        },
      },
      // Projects
      {
        type: "create",
        collection: "projects",
        docId: "project1",
        data: {
          name: "Backend API",
          taskIds: ["task1", "task2"],
        },
      },
      {
        type: "create",
        collection: "projects",
        docId: "project2",
        data: {
          name: "Frontend UI",
          taskIds: ["task3"],
        },
      },
      // Tasks
      {
        type: "create",
        collection: "tasks",
        docId: "task1",
        data: {
          title: "Implement API",
          assignedTo: "user1",
        },
      },
      {
        type: "create",
        collection: "tasks",
        docId: "task2",
        data: {
          title: "Write Tests",
          assignedTo: "user2",
        },
      },
      {
        type: "create",
        collection: "tasks",
        docId: "task3",
        data: {
          title: "Design UI",
          assignedTo: "user3",
        },
      },
    ]);

    // Test simple relationship traversal
    const friendsGraph = await firestoreService.graphQuery("users", {
      startNode: "user1",
      relationships: [
        {
          collection: "users",
          field: "friendIds",
          type: "friend",
          direction: "outbound",
        },
      ],
      depth: 2,
    });
    console.log("Friends graph results:", friendsGraph);

    // Test multiple relationship types
    const userProjectsGraph = await firestoreService.graphQuery("users", {
      startNode: "user1",
      relationships: [
        {
          collection: "groups",
          field: "groupIds",
          type: "member",
          direction: "outbound",
        },
        {
          collection: "projects",
          field: "projectIds",
          type: "assigned",
          direction: "outbound",
        },
        {
          collection: "tasks",
          field: "taskIds",
          type: "contains",
          direction: "outbound",
        },
      ],
      depth: 3,
    });
    console.log("User projects graph results:", userProjectsGraph);

    // Test bidirectional relationships
    const taskAssignmentsGraph = await firestoreService.graphQuery("tasks", {
      where: [["assignedTo", "==", "user1"]],
      relationships: [
        {
          collection: "projects",
          field: "taskIds",
          type: "belongs_to",
          direction: "inbound",
        },
        {
          collection: "groups",
          field: "projectIds",
          type: "owns",
          direction: "inbound",
        },
        {
          collection: "users",
          field: "groupIds",
          type: "member",
          direction: "inbound",
        },
      ],
      depth: 3,
    });
    console.log("Task assignments graph results:", taskAssignmentsGraph);

    // Describe subscription operations
    describe("Subscription Operations", () => {
      let unsubscribe;

      afterEach(() => {
        if (unsubscribe) {
          unsubscribe();
        }
      });

      it("should subscribe to collection changes", async () => {
        const changes = [];

        unsubscribe = await firestoreService.subscribe("tests", {
          onSnapshot: (snapshot) => {
            changes.push(snapshot);
          },
        });

        // Create test document
        await firestoreService.createOrUpdate("tests", "test1", {
          value: 100,
          category: "test",
        });

        // Wait for changes
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(changes.length).toBeGreaterThan(0);
        expect(changes[0].added.length).toBe(1);
        expect(changes[0].added[0].value).toBe(100);

        // Modify document
        await firestoreService.createOrUpdate("tests", "test1", {
          value: 200,
          category: "test",
        });

        // Wait for changes
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(changes.length).toBeGreaterThan(1);
        expect(changes[1].modified.length).toBe(1);
        expect(changes[1].modified[0].value).toBe(200);
      });

      it("should subscribe to graph changes", async () => {
        const changes = [];

        // Create test data
        await firestoreService.createOrUpdate("departments", "dept1", {
          name: "Engineering",
        });

        await firestoreService.createOrUpdate("employees", "emp1", {
          name: "John",
          departmentId: "dept1",
        });

        unsubscribe = await firestoreService.subscribeGraph("departments", {
          relationships: [
            {
              collection: "employees",
              field: "departmentId",
              type: "belongs_to",
              direction: "inbound",
            },
          ],
          onSnapshot: (snapshot) => {
            changes.push(snapshot);
          },
        });

        // Wait for initial graph
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(changes.length).toBeGreaterThan(0);
        expect(changes[0].added.length).toBeGreaterThan(0);

        // Add new employee
        await firestoreService.createOrUpdate("employees", "emp2", {
          name: "Jane",
          departmentId: "dept1",
        });

        // Wait for graph update
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(changes.length).toBeGreaterThan(1);
        expect(changes[1].added.length).toBe(1);
        expect(changes[1].added[0].data.name).toBe("Jane");
      });

      it("should handle subscription errors", async () => {
        let error = null;

        unsubscribe = await firestoreService.subscribe("invalid_collection", {
          onSnapshot: () => {},
          onError: (err) => {
            error = err;
          },
        });

        // Wait for error
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(error).not.toBeNull();
      });
    });
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Export for running from CLI
module.exports = testFeatures;
