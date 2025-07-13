/**
 * @fileoverview Graph query service for Firestore
 * @module services/firestore/queries/graph
 */

const performanceService = require('../../performance');
const securityService = require('../../security');

class GraphQueryService {
  constructor(parent) {
    this.parent = parent;
    this.db = null;
    this.idToken = null;
    this.relationships_cache = new Map();

    // Wrap with performance monitoring and security
    this.execute = performanceService.monitor(
      securityService.secure(this.execute.bind(this), {
        requireAuth: true,
        rateLimit: true,
      }),
      'graphQuery'
    );
  }

  initialize(db, idToken) {
    this.db = db;
    this.idToken = idToken;
  }

  getStatus() {
    return {
      cacheSize: this.relationships_cache.size,
      initialized: !!this.db,
    };
  }

  /**
   * Execute graph query with relationship traversal
   * @param {string} startCollection - Starting collection
   * @param {Object} params - Graph query parameters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Graph query results with metadata
   */
  async execute(startCollection, params = {}, options = {}) {
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

      // Start node query
      let query = this.db.collection(startCollection);

      // Apply filters to start node
      whereConditions.forEach(([field, op, value]) => {
        query = query.where(field, op, value);
      });

      // Apply sorting
      orderByConditions.forEach(([field, direction = 'asc']) => {
        query = query.orderBy(field, direction);
      });

      // Apply limit
      query = query.limit(limitCount);

      // Get start nodes
      const startNodes = await query.get();
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
          await this.processRelationship(
            currentNode,
            relationship,
            visited,
            queue,
            results,
            totalNodes,
            maxNodes,
            includePath
          );
        }
      }

      return {
        results,
        metadata: includeMetadata
          ? {
              timestamp: new Date(),
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
   * Process a single relationship type
   * @private
   */
  async processRelationship(
    currentNode,
    relationship,
    visited,
    queue,
    results,
    totalNodes,
    maxNodes,
    includePath
  ) {
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

    if (this.relationships_cache.has(cacheKey)) {
      // Use cached relationship data
      const cachedNodes = this.relationships_cache.get(cacheKey);
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
      relQuery = this.buildRelationshipQuery(
        currentNode,
        targetCollection,
        direction,
        field,
        relWhere,
        relOrderBy,
        relLimit
      );

      if (!relQuery) return;

      // Execute relationship query
      const relatedDocs = await relQuery.get();
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
      this.relationships_cache.set(cacheKey, relatedNodes);
    }
  }

  /**
   * Build relationship query
   * @private
   */
  buildRelationshipQuery(
    currentNode,
    targetCollection,
    direction,
    field,
    relWhere,
    relOrderBy,
    relLimit
  ) {
    if (direction === 'inbound') {
      // Target -> Source relationship
      let query = this.db.collection(targetCollection);
      query = query.where(field, '==', currentNode.id);

      // Apply additional filters
      relWhere.forEach(([f, op, val]) => {
        query = query.where(f, op, val);
      });

      // Apply sorting
      relOrderBy.forEach(([f, dir]) => {
        query = query.orderBy(f, dir);
      });

      // Apply limit
      query = query.limit(relLimit);

      return query;
    } else {
      // Source -> Target relationship
      const targetIds = Array.isArray(currentNode.data[field])
        ? currentNode.data[field]
        : [currentNode.data[field]];

      if (!targetIds.some(id => id)) return null;

      let query = this.db.collection(targetCollection);
      query = query.where('__name__', 'in', targetIds);

      // Apply additional filters
      relWhere.forEach(([f, op, val]) => {
        query = query.where(f, op, val);
      });

      // Apply sorting
      relOrderBy.forEach(([f, dir]) => {
        query = query.orderBy(f, dir);
      });

      // Apply limit
      query = query.limit(relLimit);

      return query;
    }
  }

  /**
   * Process a related node
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
}

module.exports = GraphQueryService;
