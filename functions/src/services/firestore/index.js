/**
 * @fileoverview Main entry point for Firestore services
 * @module services/firestore
 */

const GraphQueryService = require('./queries/graph');
const BasicQueryService = require('./queries/basic');
const performanceService = require('../performance');
const securityService = require('../security');
const { db } = require('../../../config/firebase-admin');

class FirestoreService {
  constructor() {
    console.log('FirestoreService: Starting initialization');

    // Initialize properties
    this.db = null;
    this.idToken = null;
    this.graphQueries = null;
    this.basicQueries = null;

    // Initialize sub-services first
    this.initializeSubServices();

    // Bind methods to this instance
    this.bindMethods();

    // Initialize with database
    this.initialize(db, null);

    console.log('FirestoreService: Initialization complete');
    console.log('FirestoreService: Methods available:', Object.keys(this));
  }

  /**
   * Initialize sub-services
   * @private
   */
  initializeSubServices() {
    console.log('FirestoreService: Initializing sub-services');
    this.graphQueries = new GraphQueryService(this);
    this.basicQueries = new BasicQueryService(this);
  }

  /**
   * Bind all methods to this instance
   * @private
   */
  bindMethods() {
    console.log('FirestoreService: Binding methods');

    // Create method references first
    const methods = {
      query: async (collectionName, params = {}) => {
        console.log('FirestoreService: Executing query on collection:', collectionName);
        return this.basicQueries.query(collectionName, params);
      },
      getDocument: async (collectionName, docId, options = {}) => {
        console.log('FirestoreService: Getting document:', collectionName, docId);
        return this.basicQueries.getDocument(collectionName, docId, options);
      },
      graphQuery: async (startCollection, params = {}, options = {}) => {
        console.log('FirestoreService: Executing graph query from:', startCollection);
        return this.graphQueries.execute(startCollection, params, options);
      },
      initialize: (db, idToken) => {
        console.log('FirestoreService: Initializing with database');
        this.db = db;
        this.idToken = idToken;
        this.graphQueries.initialize(db, idToken);
        this.basicQueries.initialize(db, idToken);
      },
      getStatus: () => ({
        initialized: !!this.db,
        services: {
          graph: this.graphQueries.getStatus(),
          basic: this.basicQueries.getStatus(),
        },
      }),
    };

    // Bind all methods to this instance
    Object.entries(methods).forEach(([name, method]) => {
      this[name] = method.bind(this);
    });
  }
}

// Create singleton instance
console.log('Creating FirestoreService singleton instance');
const firestoreService = new FirestoreService();

// Verify methods are bound
console.log('Verifying FirestoreService methods:', Object.keys(firestoreService));

// Export singleton instance
module.exports = firestoreService;
