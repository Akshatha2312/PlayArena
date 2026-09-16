const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const Game = require('../models/Game');

/**
 * List of allowed editable fields for Resource entity updates.
 */
const ALLOWED_RESOURCE_FIELDS = [
  'name',
  'code',
  'status',
  'customPricePerHour',
  'capacity',
  'locationNote',
  'floor',
  'zone',
  'positionOrder',
  'mapCoordinates',
  'displayLabel',
  'isVisibleOnMap',
  'isActive',
];

/**
 * Creates a new Resource under the specified Game.
 * @param {String} gameId - Parent Game ObjectId from route params
 * @param {Object} resourceData - Input fields from request body
 * @returns {Promise<Object>} Created Resource document
 */
const createResource = async (gameId, resourceData) => {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    const error = new Error('Invalid Game ID format');
    error.statusCode = 400;
    throw error;
  }

  const game = await Game.findById(gameId);
  if (!game) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  if (game.isActive === false) {
    const error = new Error('Cannot create resources for an inactive game');
    error.statusCode = 400;
    throw error;
  }

  const filteredData = { gameId };
  ALLOWED_RESOURCE_FIELDS.forEach((field) => {
    if (resourceData[field] !== undefined) {
      filteredData[field] = resourceData[field];
    }
  });

  const resource = new Resource(filteredData);
  const savedResource = await resource.save();
  return savedResource;
};

/**
 * Lists resources belonging to a specific Game with optional status/isActive filters & pagination.
 * @param {String} gameId - Parent Game ObjectId from route params
 * @param {Object} queryOptions - { status, isActive, page, limit }
 * @returns {Promise<Object>} { resources, pagination }
 */
const getResourcesByGame = async (gameId, queryOptions = {}) => {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    const error = new Error('Invalid Game ID format');
    error.statusCode = 400;
    throw error;
  }

  const game = await Game.findById(gameId);
  if (!game) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  const filter = { gameId };

  if (queryOptions.status) {
    filter.status = queryOptions.status;
  }

  if (queryOptions.isActive !== undefined && queryOptions.isActive !== '') {
    if (typeof queryOptions.isActive === 'boolean') {
      filter.isActive = queryOptions.isActive;
    } else if (typeof queryOptions.isActive === 'string') {
      if (queryOptions.isActive.toLowerCase() === 'true') filter.isActive = true;
      if (queryOptions.isActive.toLowerCase() === 'false') filter.isActive = false;
    }
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [resources, total] = await Promise.all([
    Resource.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Resource.countDocuments(filter),
  ]);

  return {
    resources,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single Resource by ID.
 * @param {String} resourceId
 * @returns {Promise<Object>} Resource document
 */
const getResourceById = async (resourceId) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    const error = new Error('Invalid Resource ID format');
    error.statusCode = 400;
    throw error;
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    const error = new Error('Resource not found');
    error.statusCode = 404;
    throw error;
  }

  return resource;
};

/**
 * Partially updates an existing Resource.
 * Prevents mutation of gameId, _id, createdAt, or updatedAt.
 * @param {String} resourceId
 * @param {Object} updateData
 * @returns {Promise<Object>} Updated Resource document
 */
const updateResource = async (resourceId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    const error = new Error('Invalid Resource ID format');
    error.statusCode = 400;
    throw error;
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    const error = new Error('Resource not found');
    error.statusCode = 404;
    throw error;
  }

  ALLOWED_RESOURCE_FIELDS.forEach((field) => {
    if (updateData[field] !== undefined) {
      resource[field] = updateData[field];
    }
  });

  const updatedResource = await resource.save();
  return updatedResource;
};

/**
 * Soft-deletes a Resource document by setting isActive = false.
 * Does NOT physically delete document or touch Game.
 * @param {String} resourceId
 * @returns {Promise<Object>} Soft-deleted Resource document
 */
const deleteResource = async (resourceId) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    const error = new Error('Invalid Resource ID format');
    error.statusCode = 400;
    throw error;
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    const error = new Error('Resource not found');
    error.statusCode = 404;
    throw error;
  }

  resource.isActive = false;
  const softDeletedResource = await resource.save();
  return softDeletedResource;
};

module.exports = {
  createResource,
  getResourcesByGame,
  getResourceById,
  updateResource,
  deleteResource,
};
