/**
 * @fileoverview Advanced Firestore operations with metadata tracking
 * @module services/firestore-advanced
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
  serverTimestamp,
  writeBatch,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { setTimeout, clearTimeout, setInterval } from 'timers';
const performanceService = require('./performance');
const securityService = require('./security');

class FirestoreService {
  constructor() {
    this.db = null;
    this.idToken = null;

    // Wrap methods with performance monitoring
    this.createOrUpdate = performanceService.monitor(
      securityService.secure(this.createOrUpdate.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'createOrUpdate'
    );

    this.executeBatch = performanceService.monitor(
      securityService.secure(this.executeBatch.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'executeBatch'
    );

    this.executeTransaction = performanceService.monitor(
      securityService.secure(this.executeTransaction.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'executeTransaction'
    );

    this.query = performanceService.monitor(
      securityService.secure(this.query.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'query'
    );

    this.aggregateQuery = performanceService.monitor(
      securityService.secure(this.aggregateQuery.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'aggregateQuery'
    );

    this.fullTextSearch = performanceService.monitor(
      securityService.secure(this.fullTextSearch.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'fullTextSearch'
    );

    this.graphQuery = performanceService.monitor(
      securityService.secure(this.graphQuery.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'graphQuery'
    );

    this.subscribe = performanceService.monitor(
      securityService.secure(this.subscribe.bind(this), {
        requireAuth: true,
        rateLimit: false, // Don't rate limit subscriptions
      }),
      'subscribe'
    );

    this.subscribeGraph = performanceService.monitor(
      securityService.secure(this.subscribeGraph.bind(this), {
        requireAuth: true,
        rateLimit: false, // Don't rate limit subscriptions
      }),
      'subscribeGraph'
    );
  }

  initialize(db, idToken) {
    this.db = db;
    this.idToken = idToken;

    // Start periodic cleanup
    setInterval(() => {
      performanceService.clearOldMetrics();
      performanceService.clearExpiredCache();
      securityService.clearExpiredRateLimits();
    }, 3600000); // Every hour

    // Log initialization
    performanceService.trackOperation('initialize', 0, {
      success: true,
      hasDb: !!db,
      hasToken: !!idToken,
    });
  }

  getStatus() {
    return {
      initialized: !!this.db,
      hasToken: !!this.idToken,
      performance: {
        metrics: Array.from(performanceService.metrics.entries()).map(([op, metric]) => ({
          operation: op,
          ...metric,
        })),
        recommendations: performanceService.getRecommendations(),
      },
      security: {
        rateLimits: Array.from(securityService.rateLimits.entries()).map(([key, limit]) => ({
          key,
          ...limit,
        })),
      },
    };
  }

  /**
   * Create or update a document with metadata
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @param {Object} data - Document data
   * @param {string} idToken - User performing the operation
   * @returns {Promise<Object>} Updated document
   */
  async createOrUpdate(collectionName, docId, data, idToken) {
    try {
      const docRef = doc(this.db, collectionName, docId);
      const now = Timestamp.fromDate(new Date());

      // Get existing document
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : null;
      const currentVersion = currentData?.version || 0;

      const metadata = {
        updatedAt: serverTimestamp(),
        updatedBy: 'test-user',
        version: currentVersion + 1,
      };

      if (!currentData) {
        metadata.createdAt = serverTimestamp();
        metadata.createdBy = 'test-user';
      }

      // Clean the data object to remove any undefined values
      const cleanData = this.cleanObject(data);

      const change = {
        timestamp: now,
        userId: 'test-user',
        type: currentData ? 'update' : 'create',
        changes: this.diffObjects(currentData || {}, cleanData),
      };

      const newData = {
        ...cleanData,
        ...metadata,
        history: currentData?.history ? [...currentData.history, change].slice(-50) : [change],
      };

      await setDoc(docRef, newData, { merge: true });

      // Return a clean version of the data with regular timestamps
      return {
        id: docId,
        ...cleanData,
        updatedAt: now,
        updatedBy: 'test-user',
        version: currentVersion + 1,
        createdAt: currentData ? currentData.createdAt : now,
        createdBy: currentData ? currentData.createdBy : 'test-user',
        history: newData.history,
      };
    } catch (error) {
      console.error('Error in createOrUpdate:', error);
      throw error;
    }
  }

  /**
   * Compare objects to track changes
   * @private
   */
  diffObjects(oldObj, newObj) {
    const changes = {};
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const oldValue = oldObj[key];
      const newValue = newObj[key];

      // Only record changes if values are different and not undefined
      if (oldValue !== newValue && newValue !== undefined) {
        changes[key] = {
          from: oldValue === undefined ? null : this.cleanValue(oldValue),
          to: this.cleanValue(newValue),
        };
      }
    }

    return changes;
  }

  /**
   * Clean a single value for Firestore storage
   * @private
   */
  cleanValue(value) {
    if (value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }
    if (Array.isArray(value)) {
      return value.map(v => this.cleanValue(v));
    }
    if (typeof value === 'object' && value !== null) {
      return this.cleanObject(value);
    }
    return value;
  }

  /**
   * Clean object by removing undefined values and converting dates
   * @private
   */
  cleanObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = this.cleanValue(value);
      if (cleanValue !== undefined && cleanValue !== null) {
        clean[key] = cleanValue;
      }
    }
    return clean;
  }

  /**
   * Query documents with filtering, sorting, and pagination
   * @param {string} collectionName - Collection to query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query results
   */
  async query(collectionName, params = {}) {
    const {
      where: whereConditions = [],
      orderBy: orderByConditions = [],
      limit: limitCount = 100,
    } = params;

    let q = collection(this.db, collectionName);

    // Apply filters
    whereConditions.forEach(([field, op, value]) => {
      q = query(q, where(field, op, value));
    });

    // Apply sorting
    orderByConditions.forEach(([field, direction = 'asc']) => {
      q = query(q, orderBy(field, direction));
    });

    // Apply limit
    q = query(q, limit(limitCount));

    // Execute query
    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      results,
      pagination: {
        hasMore: results.length === limitCount,
        lastId: results[results.length - 1]?.id,
      },
    };
  }

  /**
   * Execute batch operations with metadata tracking
   * @param {Array<Object>} operations - Array of operations to perform
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch results
   */
  async executeBatch(operations, options = {}) {
    const {
      continueOnError = false,
      batchSize = 500, // Firestore limit is 500
      progressCallback = null,
    } = options;

    try {
      const results = {
        successful: [],
        failed: [],
        total: operations.length,
      };

      // Split operations into batches of batchSize
      const batches = [];
      for (let i = 0; i < operations.length; i += batchSize) {
        batches.push(operations.slice(i, i + batchSize));
      }

      const now = Timestamp.fromDate(new Date());

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const currentBatch = batches[batchIndex];
        const batch = writeBatch(this.db);
        const batchOperations = [];

        // Prepare all operations in current batch
        for (const operation of currentBatch) {
          try {
            const { type, collection: collectionName, docId, data = {} } = operation;
            const docRef = doc(this.db, collectionName, docId);
            const cleanData = this.cleanObject(data);

            // Get existing document for metadata
            const docSnap = await getDoc(docRef);
            const currentData = docSnap.exists() ? docSnap.data() : null;
            const currentVersion = currentData?.version || 0;

            const metadata = {
              updatedAt: serverTimestamp(),
              updatedBy: 'test-user',
              version: currentVersion + 1,
            };

            if (!currentData) {
              metadata.createdAt = serverTimestamp();
              metadata.createdBy = 'test-user';
            }

            const change = {
              timestamp: now,
              userId: 'test-user',
              type: type || (currentData ? 'update' : 'create'),
              changes: this.diffObjects(currentData || {}, cleanData),
            };

            const newData = {
              ...cleanData,
              ...metadata,
              history: currentData?.history
                ? [...currentData.history, change].slice(-50)
                : [change],
            };

            switch (type) {
              case 'delete':
                batch.delete(docRef);
                break;
              case 'update':
                batch.update(docRef, newData);
                break;
              default: // create or set
                batch.set(docRef, newData, { merge: true });
            }

            batchOperations.push({
              ref: docRef,
              type,
              data: newData,
              original: operation,
            });
          } catch (error) {
            if (!continueOnError) {
              throw error;
            }
            results.failed.push({
              operation,
              error: error.message,
            });
          }
        }

        // Commit the batch
        try {
          await batch.commit();
          results.successful.push(
            ...batchOperations.map(op => ({
              id: op.ref.id,
              collection: op.ref.parent.id,
              type: op.type,
              data: op.data,
            }))
          );
        } catch (error) {
          if (!continueOnError) {
            throw error;
          }
          results.failed.push(
            ...batchOperations.map(op => ({
              operation: op.original,
              error: error.message,
            }))
          );
        }

        // Report progress if callback provided
        if (progressCallback) {
          const progress = {
            batch: batchIndex + 1,
            totalBatches: batches.length,
            processed: results.successful.length + results.failed.length,
            total: operations.length,
            successful: results.successful.length,
            failed: results.failed.length,
          };
          await progressCallback(progress);
        }
      }

      return results;
    } catch (error) {
      console.error('Batch operation error:', error);
      throw error;
    }
  }

  /**
   * Execute operations in a transaction with metadata tracking
   * @param {Function} operations - Function containing transaction operations
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} Transaction results
   */
  async executeTransaction(operations, options = {}) {
    const { maxAttempts = 5, timeout = 30000 } = options;

    try {
      const self = this; // Store reference to this
      return await runTransaction(
        this.db,
        async transaction => {
          const now = Timestamp.fromDate(new Date());
          const transactionOperations = [];
          const pendingWrites = [];

          // Create transaction wrapper with metadata tracking
          const txn = {
            // Read operations
            async get(collectionName, docId) {
              const docRef = doc(self.db, collectionName, docId);
              const docSnap = await transaction.get(docRef);
              return docSnap.exists() ? { id: docId, ...docSnap.data() } : null;
            },

            // Write operations (these will be queued and executed after all reads)
            async set(collectionName, docId, data, options = { merge: true }) {
              const docRef = doc(self.db, collectionName, docId);
              const cleanData = self.cleanObject(data);

              // Queue the write operation
              pendingWrites.push(async () => {
                // Get existing document for metadata
                const docSnap = await transaction.get(docRef);
                const currentData = docSnap.exists() ? docSnap.data() : null;
                const currentVersion = currentData?.version || 0;

                const metadata = {
                  updatedAt: serverTimestamp(),
                  updatedBy: 'test-user',
                  version: currentVersion + 1,
                };

                if (!currentData) {
                  metadata.createdAt = serverTimestamp();
                  metadata.createdBy = 'test-user';
                }

                const change = {
                  timestamp: now,
                  userId: 'test-user',
                  type: currentData ? 'update' : 'create',
                  changes: self.diffObjects(currentData || {}, cleanData),
                };

                const newData = {
                  ...cleanData,
                  ...metadata,
                  history: currentData?.history
                    ? [...currentData.history, change].slice(-50)
                    : [change],
                };

                transaction.set(docRef, newData, options);
                transactionOperations.push({
                  type: 'set',
                  ref: docRef,
                  data: newData,
                });

                return { id: docId, ...newData };
              });

              // Return a placeholder that will be updated after writes are executed
              return { id: docId, ...cleanData };
            },

            async update(collectionName, docId, data) {
              const docRef = doc(self.db, collectionName, docId);
              const cleanData = self.cleanObject(data);

              // Queue the write operation
              pendingWrites.push(async () => {
                // Get existing document for metadata
                const docSnap = await transaction.get(docRef);
                if (!docSnap.exists()) {
                  throw new Error(`Document ${docId} does not exist in ${collectionName}`);
                }

                const currentData = docSnap.data();
                const currentVersion = currentData.version || 0;

                const metadata = {
                  updatedAt: serverTimestamp(),
                  updatedBy: 'test-user',
                  version: currentVersion + 1,
                };

                const change = {
                  timestamp: now,
                  userId: 'test-user',
                  type: 'update',
                  changes: self.diffObjects(currentData, cleanData),
                };

                const newData = {
                  ...cleanData,
                  ...metadata,
                  history: [...(currentData.history || []), change].slice(-50),
                };

                transaction.update(docRef, newData);
                transactionOperations.push({
                  type: 'update',
                  ref: docRef,
                  data: newData,
                });

                return { id: docId, ...newData };
              });

              // Return a placeholder that will be updated after writes are executed
              return { id: docId, ...cleanData };
            },

            async delete(collectionName, docId) {
              const docRef = doc(self.db, collectionName, docId);

              // Queue the delete operation
              pendingWrites.push(async () => {
                transaction.delete(docRef);
                transactionOperations.push({
                  type: 'delete',
                  ref: docRef,
                });
              });
            },
          };

          // Execute user-defined operations to collect all reads
          const result = await operations(txn);

          // Execute all pending writes
          await Promise.all(pendingWrites.map(write => write()));

          // Return both the operation result and metadata
          return {
            result,
            operations: transactionOperations.map(op => ({
              type: op.type,
              collection: op.ref.parent.id,
              id: op.ref.id,
              data: op.data,
            })),
          };
        },
        { maxAttempts, timeout }
      );
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Execute aggregation queries with metadata tracking
   * @param {string} collectionName - Collection to query
   * @param {Object} params - Aggregation parameters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Aggregation results
   */
  async aggregateQuery(collectionName, params = {}, options = {}) {
    try {
      const {
        groupBy = [],
        aggregates = {},
        where: whereConditions = [],
        orderBy: orderByConditions = [],
        limit: limitCount = 100,
      } = params;

      const { includeMetadata = false, cacheResults = false } = options;

      let q = collection(this.db, collectionName);

      // Apply filters
      whereConditions.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });

      // Apply sorting
      orderByConditions.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });

      // Apply limit
      q = query(q, limit(limitCount));

      // Execute query
      const querySnapshot = await getDocs(q);
      const results = [];
      const aggregateResults = {};

      // Initialize aggregate accumulators
      for (const [name, config] of Object.entries(aggregates)) {
        aggregateResults[name] = {
          count: 0,
          sum: 0,
          min: null,
          max: null,
          avg: 0,
        };
      }

      // Process documents
      querySnapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          ...data,
        });

        // Calculate aggregates
        for (const [name, config] of Object.entries(aggregates)) {
          const { field, type } = config;
          const value = data[field];

          if (value !== undefined && value !== null) {
            const agg = aggregateResults[name];
            agg.count++;

            switch (type) {
              case 'sum':
                agg.sum += value;
                break;
              case 'min':
                agg.min = agg.min === null ? value : Math.min(agg.min, value);
                break;
              case 'max':
                agg.max = agg.max === null ? value : Math.max(agg.max, value);
                break;
              case 'avg':
                agg.sum += value;
                agg.avg = agg.sum / agg.count;
                break;
            }
          }
        }
      });

      // Group results if groupBy fields are specified
      let groupedResults = results;
      if (groupBy.length > 0) {
        const groups = new Map();

        results.forEach(doc => {
          const groupKey = groupBy.map(field => doc[field]).join('|');
          if (!groups.has(groupKey)) {
            groups.set(groupKey, {
              group: Object.fromEntries(groupBy.map(field => [field, doc[field]])),
              docs: [],
              aggregates: JSON.parse(JSON.stringify(aggregateResults)), // Deep clone
            });
          }

          const group = groups.get(groupKey);
          group.docs.push(doc);

          // Calculate group aggregates
          for (const [name, config] of Object.entries(aggregates)) {
            const { field, type } = config;
            const value = doc[field];

            if (value !== undefined && value !== null) {
              const agg = group.aggregates[name];
              agg.count++;

              switch (type) {
                case 'sum':
                  agg.sum += value;
                  break;
                case 'min':
                  agg.min = agg.min === null ? value : Math.min(agg.min, value);
                  break;
                case 'max':
                  agg.max = agg.max === null ? value : Math.max(agg.max, value);
                  break;
                case 'avg':
                  agg.sum += value;
                  agg.avg = agg.sum / agg.count;
                  break;
              }
            }
          }
        });

        groupedResults = Array.from(groups.values());
      }

      return {
        results: groupedResults,
        aggregates: aggregateResults,
        metadata: includeMetadata
          ? {
              timestamp: Timestamp.fromDate(new Date()),
              total: results.length,
              params,
              options,
            }
          : undefined,
        pagination: {
          hasMore: results.length === limitCount,
          lastId: results[results.length - 1]?.id,
        },
      };
    } catch (error) {
      console.error('Aggregation query error:', error);
      throw error;
    }
  }

  /**
   * Execute full-text search with relevance scoring and metadata tracking
   * @param {string} collectionName - Collection to search
   * @param {Object} params - Search parameters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with relevance scores
   */
  async fullTextSearch(collectionName, params = {}, options = {}) {
    try {
      const {
        query: searchQuery = '',
        fields = [],
        where: whereConditions = [],
        orderBy: orderByConditions = [],
        limit: limitCount = 100,
        minScore = 0.2,
      } = params;

      const {
        includeMetadata = false,
        caseSensitive = false,
        fuzzyMatch = true,
        highlightMatches = true,
      } = options;

      // Tokenize search query
      const searchTokens = this.tokenizeText(searchQuery, { caseSensitive });
      let q = collection(this.db, collectionName);

      // Apply filters
      whereConditions.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });

      // Apply sorting
      orderByConditions.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });

      // Apply limit with buffer for filtering by relevance
      q = query(q, limit(limitCount * 3));

      // Execute query
      const querySnapshot = await getDocs(q);
      const results = [];

      // Process documents and calculate relevance scores
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const docTokens = new Set();
        let maxScore = 0;
        const matches = {};

        // Tokenize and index specified fields
        fields.forEach(field => {
          const fieldValue = data[field];
          if (fieldValue) {
            const tokens = this.tokenizeText(fieldValue.toString(), { caseSensitive });
            tokens.forEach(token => docTokens.add(token));

            // Calculate field-level relevance score
            const fieldScore = this.calculateRelevance(searchTokens, tokens, {
              fuzzyMatch,
            });
            maxScore = Math.max(maxScore, fieldScore);

            // Store matches for highlighting
            if (highlightMatches && fieldScore > minScore) {
              matches[field] = this.highlightMatches(fieldValue.toString(), searchTokens, {
                caseSensitive,
                fuzzyMatch,
              });
            }
          }
        });

        // Only include documents that meet minimum relevance score
        if (maxScore >= minScore) {
          results.push({
            id: doc.id,
            ...data,
            _search: {
              score: maxScore,
              matches: highlightMatches ? matches : undefined,
            },
          });
        }
      });

      // Sort by relevance score
      results.sort((a, b) => b._search.score - a._search.score);

      // Apply final limit
      const limitedResults = results.slice(0, limitCount);

      return {
        results: limitedResults,
        metadata: includeMetadata
          ? {
              timestamp: Timestamp.fromDate(new Date()),
              total: results.length,
              params,
              options,
              searchTokens,
            }
          : undefined,
        pagination: {
          hasMore: results.length > limitCount,
          lastId: limitedResults[limitedResults.length - 1]?.id,
        },
      };
    } catch (error) {
      console.error('Full-text search error:', error);
      throw error;
    }
  }

  /**
   * Tokenize text for search
   * @private
   */
  tokenizeText(text, options = {}) {
    const { caseSensitive = false } = options;
    const normalized = caseSensitive ? text : text.toLowerCase();

    // Split on word boundaries and remove empty tokens
    return normalized
      .split(/[\s,.!?;:'"()[\]{}<>/|+=~`@#$%^&*-]+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate relevance score between search tokens and document tokens
   * @private
   */
  calculateRelevance(searchTokens, docTokens, options = {}) {
    const { fuzzyMatch = true } = options;
    let matches = 0;
    const totalTokens = searchTokens.length;

    searchTokens.forEach(searchToken => {
      if (fuzzyMatch) {
        // Use Levenshtein distance for fuzzy matching
        const maxDistance = Math.floor(searchToken.length * 0.3); // Allow 30% difference
        for (const docToken of docTokens) {
          if (this.levenshteinDistance(searchToken, docToken) <= maxDistance) {
            matches++;
            break;
          }
        }
      } else {
        // Exact matching
        if (docTokens.has(searchToken)) {
          matches++;
        }
      }
    });

    return matches / totalTokens;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @private
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill()
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Highlight matching text portions
   * @private
   */
  highlightMatches(text, searchTokens, options = {}) {
    const { caseSensitive = false, fuzzyMatch = true } = options;
    const normalizedText = caseSensitive ? text : text.toLowerCase();
    const matches = [];
    let lastIndex = 0;

    // Find all matching positions
    searchTokens.forEach(searchToken => {
      const tokenLen = searchToken.length;
      let index = 0;

      while ((index = normalizedText.indexOf(searchToken, lastIndex)) !== -1) {
        matches.push({
          start: index,
          end: index + tokenLen,
          token: text.slice(index, index + tokenLen),
        });
        lastIndex = index + 1;
      }

      if (fuzzyMatch) {
        // Add fuzzy matches
        const words = normalizedText.split(/\s+/);
        const maxDistance = Math.floor(searchToken.length * 0.3);

        words.forEach((word, wordIndex) => {
          if (this.levenshteinDistance(searchToken, word) <= maxDistance) {
            const startPos = normalizedText.indexOf(word);
            matches.push({
              start: startPos,
              end: startPos + word.length,
              token: text.slice(startPos, startPos + word.length),
              fuzzy: true,
            });
          }
        });
      }
    });

    // Sort matches by position and merge overlapping ranges
    matches.sort((a, b) => a.start - b.start);
    const mergedMatches = [];
    let currentMatch = null;

    matches.forEach(match => {
      if (!currentMatch) {
        currentMatch = { ...match };
      } else if (match.start <= currentMatch.end) {
        currentMatch.end = Math.max(currentMatch.end, match.end);
      } else {
        mergedMatches.push(currentMatch);
        currentMatch = { ...match };
      }
    });
    if (currentMatch) {
      mergedMatches.push(currentMatch);
    }

    return mergedMatches;
  }

  /**
   * Execute graph queries with relationship traversal
   * @param {string} startCollection - Starting collection
   * @param {Object} params - Graph query parameters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Graph query results with metadata
   */
  async graphQuery(startCollection, params = {}, options = {}) {
    try {
      const {
        startNode = null,
        relationships = [],
        depth = 1,
        where: whereConditions = [],
        orderBy: orderByConditions = [],
        limit: limitCount = 100,
      } = params;

      const { includeMetadata = false, includePath = true, maxNodes = 1000 } = options;

      // Validate depth to prevent excessive traversal
      const maxDepth = Math.min(depth, 5);
      let totalNodes = 0;
      const visited = new Set();
      const results = [];
      const relationships_cache = new Map();

      // Start node query
      let q = collection(this.db, startCollection);

      // Apply filters to start node
      whereConditions.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });

      // Apply sorting
      orderByConditions.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });

      // Apply limit
      q = query(q, limit(limitCount));

      // Get start nodes
      const startNodes = await getDocs(q);
      const queue = [];

      // Initialize queue with start nodes
      startNodes.forEach(doc => {
        const data = doc.data();
        const node = {
          id: doc.id,
          collection: startCollection,
          data,
          depth: 0,
          path: includePath ? [{ id: doc.id, collection: startCollection }] : undefined,
        };
        queue.push(node);
        visited.add(`${startCollection}/${doc.id}`);
        results.push(node);
        totalNodes++;
      });

      // Process queue for relationship traversal
      while (queue.length > 0 && totalNodes < maxNodes) {
        const currentNode = queue.shift();
        if (currentNode.depth >= maxDepth) continue;

        // Process each relationship type
        for (const relationship of relationships) {
          const {
            collection: targetCollection,
            direction = 'outbound',
            field,
            type,
            where: relWhere = [],
            orderBy: relOrderBy = [],
            limit: relLimit = 10,
          } = relationship;

          // Build relationship query
          let relQuery;
          const cacheKey = `${currentNode.collection}/${currentNode.id}/${targetCollection}/${type}`;

          if (relationships_cache.has(cacheKey)) {
            // Use cached relationship data
            const cachedNodes = relationships_cache.get(cacheKey);
            for (const nodeData of cachedNodes) {
              await this.processRelatedNode(
                nodeData,
                currentNode,
                visited,
                queue,
                results,
                totalNodes,
                maxNodes,
                includePath
              );
              totalNodes++;
            }
          } else {
            // Query relationship based on direction
            if (direction === 'inbound') {
              // Target -> Source relationship
              relQuery = query(
                collection(this.db, targetCollection),
                where(field, '==', currentNode.id),
                ...relWhere.map(([f, op, val]) => where(f, op, val)),
                ...relOrderBy.map(([f, dir]) => orderBy(f, dir)),
                limit(relLimit)
              );
            } else {
              // Source -> Target relationship
              const targetIds = Array.isArray(currentNode.data[field])
                ? currentNode.data[field]
                : [currentNode.data[field]];

              if (!targetIds.some(id => id)) continue;

              relQuery = query(
                collection(this.db, targetCollection),
                where('__name__', 'in', targetIds),
                ...relWhere.map(([f, op, val]) => where(f, op, val)),
                ...relOrderBy.map(([f, dir]) => orderBy(f, dir)),
                limit(relLimit)
              );
            }

            // Execute relationship query
            const relatedDocs = await getDocs(relQuery);
            const relatedNodes = [];

            for (const relatedDoc of relatedDocs.docs) {
              const nodeData = {
                id: relatedDoc.id,
                collection: targetCollection,
                data: relatedDoc.data(),
                relationshipType: type,
              };
              relatedNodes.push(nodeData);

              await this.processRelatedNode(
                nodeData,
                currentNode,
                visited,
                queue,
                results,
                totalNodes,
                maxNodes,
                includePath
              );
              totalNodes++;
            }

            // Cache relationship data
            relationships_cache.set(cacheKey, relatedNodes);
          }
        }
      }

      return {
        results,
        metadata: includeMetadata
          ? {
              timestamp: Timestamp.fromDate(new Date()),
              totalNodes,
              maxDepth,
              params,
              options,
            }
          : undefined,
        pagination: {
          hasMore: totalNodes >= maxNodes,
          nodesProcessed: totalNodes,
        },
      };
    } catch (error) {
      console.error('Graph query error:', error);
      throw error;
    }
  }

  /**
   * Process a related node in graph traversal
   * @private
   */
  async processRelatedNode(
    nodeData,
    parentNode,
    visited,
    queue,
    results,
    totalNodes,
    maxNodes,
    includePath
  ) {
    const nodeKey = `${nodeData.collection}/${nodeData.id}`;
    if (visited.has(nodeKey) || totalNodes >= maxNodes) return;

    visited.add(nodeKey);
    const node = {
      ...nodeData,
      depth: parentNode.depth + 1,
      path: includePath
        ? [...parentNode.path, { id: nodeData.id, collection: nodeData.collection }]
        : undefined,
    };

    results.push(node);
    queue.push(node);
  }

  /**
   * Create a real-time subscription with metadata tracking
   * @param {string} collectionName - Collection to subscribe to
   * @param {Object} params - Subscription parameters
   * @param {Object} options - Subscription options
   * @returns {Promise<Unsubscribe>} Unsubscribe function
   */
  async subscribe(collectionName, params = {}, options = {}) {
    try {
      const {
        where: whereConditions = [],
        orderBy: orderByConditions = [],
        limit: limitCount = 100,
        onSnapshot,
        onError,
      } = params;

      const { includeMetadata = false, includeChanges = true, bufferTime = 1000 } = options;

      if (!onSnapshot) {
        throw new Error('onSnapshot handler is required');
      }

      // Build query
      let q = collection(this.db, collectionName);

      // Apply filters
      whereConditions.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });

      // Apply sorting
      orderByConditions.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });

      // Apply limit
      q = query(q, limit(limitCount));

      // Buffer for batching updates
      let buffer = [];
      let bufferTimeout = null;

      // Process buffered changes
      const processBuffer = () => {
        if (buffer.length === 0) return;

        const changes = {
          added: [],
          modified: [],
          removed: [],
          metadata: includeMetadata
            ? {
                timestamp: Timestamp.fromDate(new Date()),
                total: buffer.length,
              }
            : undefined,
        };

        // Process changes
        buffer.forEach(change => {
          const doc = change.doc;
          const data = doc.data();
          const item = {
            id: doc.id,
            ...data,
            _snapshot: {
              type: change.type,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex,
            },
          };

          switch (change.type) {
            case 'added':
              changes.added.push(item);
              break;
            case 'modified':
              changes.modified.push(item);
              break;
            case 'removed':
              changes.removed.push(item);
              break;
          }
        });

        // Clear buffer
        buffer = [];
        bufferTimeout = null;

        // Notify subscriber
        onSnapshot(changes);
      };

      // Create snapshot listener
      const unsubscribe = onSnapshot(
        q,
        {
          includeMetadataChanges: includeMetadata,
        },
        snapshot => {
          try {
            if (includeChanges) {
              // Buffer changes
              buffer.push(...snapshot.docChanges());

              // Process buffer after delay or immediately if full
              if (bufferTimeout) {
                clearTimeout(bufferTimeout);
              }
              if (buffer.length >= 100) {
                processBuffer();
              } else {
                bufferTimeout = setTimeout(processBuffer, bufferTime);
              }
            } else {
              // Send entire snapshot
              const results = [];
              snapshot.forEach(doc => {
                results.push({
                  id: doc.id,
                  ...doc.data(),
                });
              });

              onSnapshot({
                results,
                metadata: includeMetadata
                  ? {
                      timestamp: Timestamp.fromDate(new Date()),
                      total: results.length,
                      fromCache: snapshot.metadata.fromCache,
                      hasPendingWrites: snapshot.metadata.hasPendingWrites,
                    }
                  : undefined,
              });
            }
          } catch (error) {
            if (onError) {
              onError(error);
            } else {
              console.error('Subscription processing error:', error);
            }
          }
        },
        error => {
          if (onError) {
            onError(error);
          } else {
            console.error('Subscription error:', error);
          }
        }
      );

      // Return unsubscribe function wrapped with cleanup
      return () => {
        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
          processBuffer(); // Process any remaining changes
        }
        unsubscribe();
      };
    } catch (error) {
      console.error('Subscription setup error:', error);
      throw error;
    }
  }

  /**
   * Create a real-time graph subscription
   * @param {string} startCollection - Starting collection
   * @param {Object} params - Graph subscription parameters
   * @param {Object} options - Subscription options
   * @returns {Promise<Unsubscribe>} Unsubscribe function
   */
  async subscribeGraph(startCollection, params = {}, options = {}) {
    try {
      const {
        startNode = null,
        relationships = [],
        depth = 1,
        where: whereConditions = [],
        orderBy: orderByConditions = [],
        limit: limitCount = 100,
        onSnapshot,
        onError,
      } = params;

      const {
        includeMetadata = false,
        includePath = true,
        maxNodes = 1000,
        bufferTime = 1000,
      } = options;

      if (!onSnapshot) {
        throw new Error('onSnapshot handler is required');
      }

      // Track active subscriptions
      const subscriptions = new Map();
      const nodeCache = new Map();
      let buffer = [];
      let bufferTimeout = null;
      let isProcessing = false;

      // Process buffered changes
      const processBuffer = async () => {
        if (isProcessing || buffer.length === 0) return;
        isProcessing = true;

        try {
          // Execute graph query with current state
          const graphResult = await this.graphQuery(
            startCollection,
            {
              startNode,
              relationships,
              depth,
              where: whereConditions,
              orderBy: orderByConditions,
              limit: limitCount,
            },
            {
              includeMetadata,
              includePath,
              maxNodes,
            }
          );

          // Compare with cached state and generate change set
          const changes = {
            added: [],
            modified: [],
            removed: [],
            relationships: [],
            metadata: graphResult.metadata,
          };

          // Process nodes
          graphResult.results.forEach(node => {
            const cacheKey = `${node.collection}/${node.id}`;
            const cachedNode = nodeCache.get(cacheKey);

            if (!cachedNode) {
              changes.added.push(node);
            } else if (JSON.stringify(cachedNode.data) !== JSON.stringify(node.data)) {
              changes.modified.push(node);
            }

            nodeCache.set(cacheKey, node);
          });

          // Find removed nodes
          for (const [cacheKey, cachedNode] of nodeCache.entries()) {
            if (!graphResult.results.some(node => `${node.collection}/${node.id}` === cacheKey)) {
              changes.removed.push(cachedNode);
              nodeCache.delete(cacheKey);
            }
          }

          // Clear buffer and notify
          buffer = [];
          bufferTimeout = null;
          onSnapshot(changes);
        } catch (error) {
          if (onError) {
            onError(error);
          } else {
            console.error('Graph subscription processing error:', error);
          }
        } finally {
          isProcessing = false;
        }
      };

      // Subscribe to start collection
      const subscribeToNode = async (collection, conditions = []) => {
        const subscription = await this.subscribe(
          collection,
          {
            where: conditions,
            orderBy: orderByConditions,
            limit: limitCount,
            onSnapshot: changes => {
              buffer.push({
                collection,
                changes,
              });

              // Process buffer after delay or immediately if full
              if (bufferTimeout) {
                clearTimeout(bufferTimeout);
              }
              if (buffer.length >= 100) {
                processBuffer();
              } else {
                bufferTimeout = setTimeout(processBuffer, bufferTime);
              }
            },
            onError,
          },
          {
            includeMetadata,
            includeChanges: true,
            bufferTime,
          }
        );

        subscriptions.set(collection, subscription);
      };

      // Subscribe to start collection
      await subscribeToNode(startCollection, whereConditions);

      // Subscribe to relationship collections
      for (const relationship of relationships) {
        const { collection: targetCollection } = relationship;
        if (!subscriptions.has(targetCollection)) {
          await subscribeToNode(targetCollection);
        }
      }

      // Return unsubscribe function that cleans up all subscriptions
      return () => {
        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
          processBuffer(); // Process any remaining changes
        }
        subscriptions.forEach(unsubscribe => unsubscribe());
        subscriptions.clear();
        nodeCache.clear();
      };
    } catch (error) {
      console.error('Graph subscription setup error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const firestoreService = new FirestoreService();
module.exports = firestoreService;
