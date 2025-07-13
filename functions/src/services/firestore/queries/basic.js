/**
 * @fileoverview Basic query service for Firestore
 * @module services/firestore/queries/basic
 */

const performanceService = require('../../performance');
const securityService = require('../../security');

class BasicQueryService {
  constructor(parent) {
    this.parent = parent;
    this.db = null;
    this.idToken = null;

    // Wrap with performance monitoring and security
    this.query = performanceService.monitor(
      securityService.secure(this.query.bind(this), {
        requireAuth: false,
        rateLimit: true,
      }),
      'basicQuery'
    );

    this.getDocument = performanceService.monitor(
      securityService.secure(this.getDocument.bind(this), {
        requireAuth: false,
        rateLimit: true,
      }),
      'getDocument'
    );
  }

  initialize(db, idToken) {
    this.db = db;
    this.idToken = idToken;
  }

  getStatus() {
    return {
      initialized: !!this.db,
    };
  }

  /**
   * Execute a basic query on a collection
   * @param {string} collectionName - Collection to query
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(collectionName, params = {}) {
    try {
      const {
        where: whereConditions = [],
        orderBy: orderByConditions = [],
        limit: limitCount = 100,
        includeMetadata = false,
      } = params;

      // Build query
      let query = this.db.collection(collectionName);

      // Apply filters
      whereConditions.forEach(([field, op, value]) => {
        query = query.where(field, op, value);
      });

      // Apply sorting
      orderByConditions.forEach(([field, direction = 'asc']) => {
        query = query.orderBy(field, direction);
      });

      // Apply limit
      query = query.limit(limitCount);

      // Execute query
      const snapshot = await query.get();
      const results = [];

      snapshot.forEach(doc => {
        results.push({
          id: doc.id,
          ...doc.data(),
          ...(includeMetadata
            ? {
                metadata: {
                  createdAt: doc.createTime?.toDate(),
                  updatedAt: doc.updateTime?.toDate(),
                  readAt: new Date(),
                },
              }
            : {}),
        });
      });

      return results;
    } catch (error) {
      console.error('Basic query error:', error);
      throw error;
    }
  }

  /**
   * Get a single document with optional field selection
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Document data
   */
  async getDocument(collectionName, docId, options = {}) {
    try {
      const { fields = [], includeMetadata = false } = options;

      const docRef = this.db.collection(collectionName).doc(docId);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return null;
      }

      let data = snapshot.data();

      // Handle nested field selection
      if (fields && fields.length > 0) {
        let result = data;
        for (const field of fields) {
          result = result[field];
          if (result === undefined) {
            return null;
          }
        }
        data = result;
      }

      return {
        id: snapshot.id,
        ...data,
        ...(includeMetadata
          ? {
              metadata: {
                createdAt: snapshot.createTime?.toDate(),
                updatedAt: snapshot.updateTime?.toDate(),
                readAt: new Date(),
              },
            }
          : {}),
      };
    } catch (error) {
      console.error('Get document error:', error);
      throw error;
    }
  }
}

module.exports = BasicQueryService;
