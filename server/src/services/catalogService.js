const mongoose = require('mongoose');
const Game = require('../models/Game');
const Resource = require('../models/Resource');

/**
 * Sanitizes Game document for public/customer catalog API response.
 */
const formatCustomerGame = (game) => ({
  _id: game._id,
  name: game.name,
  slug: game.slug,
  description: game.description || '',
  category: game.category,
  basePricePerHour: game.basePricePerHour,
  minBookingDurationMinutes: game.minBookingDurationMinutes,
  maxBookingDurationMinutes: game.maxBookingDurationMinutes,
  bookingIntervalMinutes: game.bookingIntervalMinutes,
  minPlayers: game.minPlayers,
  maxPlayers: game.maxPlayers,
  imageUrl: game.imageUrl || '',
  isActive: game.isActive,
  createdAt: game.createdAt,
  updatedAt: game.updatedAt,
});

/**
 * Sanitizes Resource document for public/customer catalog API response.
 * Strictly omits administrative internal fields: code and locationNote.
 */
const formatCustomerResource = (resource) => ({
  _id: resource._id,
  gameId: resource.gameId,
  name: resource.name,
  status: resource.status,
  customPricePerHour: resource.customPricePerHour !== undefined ? resource.customPricePerHour : null,
  capacity: resource.capacity !== undefined ? resource.capacity : null,
  isActive: resource.isActive,
});

/**
 * Retrieves public catalog of active games with optional category filtering and pagination.
 * @param {Object} queryOptions - { category, page, limit }
 * @returns {Promise<Object>} { games, pagination }
 */
const getPublicGames = async (queryOptions = {}) => {
  if (mongoose.connection.readyState !== 1) {
    const mockGames = [
      { _id: '6aaa9d74c64f9e629c80e001', name: 'Badminton Court', slug: 'badminton', description: 'Professional BWF standard indoor badminton court.', category: 'Racquet Sports', basePricePerHour: 400, minBookingDurationMinutes: 60, maxBookingDurationMinutes: 180, bookingIntervalMinutes: 60, minPlayers: 2, maxPlayers: 4, imageUrl: '', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { _id: '6aaa9d74c64f9e629c80e002', name: 'Bowling Alley', slug: 'bowling', description: '10-pin automatic bowling lane with arcade light system.', category: 'Arcade & Bowling', basePricePerHour: 600, minBookingDurationMinutes: 60, maxBookingDurationMinutes: 120, bookingIntervalMinutes: 60, minPlayers: 1, maxPlayers: 6, imageUrl: '', isActive: true, createdAt: new Date(), updatedAt: new Date() }
    ];
    return {
      games: mockGames.map(formatCustomerGame),
      pagination: { total: mockGames.length, page: 1, limit: 10, totalPages: 1 }
    };
  }

  const filter = { isActive: true };

  if (queryOptions.category) {
    filter.category = queryOptions.category;
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [games, total] = await Promise.all([
    Game.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Game.countDocuments(filter),
  ]);

  return {
    games: games.map(formatCustomerGame),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single active game by ID for public/customer viewing.
 * Inactive games return 404 Not Found to avoid leaking internal catalog state.
 * @param {String} gameId
 * @returns {Promise<Object>} Formatted Game object
 */
const getPublicGameById = async (gameId) => {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    const error = new Error('Invalid Game ID format');
    error.statusCode = 400;
    throw error;
  }

  const game = await Game.findById(gameId);
  if (!game || game.isActive === false) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  return formatCustomerGame(game);
};

/**
 * Retrieves operational catalog resources belonging to an active Game.
 * Only returns resources where Resource.isActive === true AND Resource.status === 'available'.
 * Strictly excludes administrative fields (code, locationNote).
 * @param {String} gameId
 * @param {Object} queryOptions - { page, limit }
 * @returns {Promise<Object>} { resources, pagination }
 */
const getPublicGameResources = async (gameId, queryOptions = {}) => {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    const error = new Error('Invalid Game ID format');
    error.statusCode = 400;
    throw error;
  }

  const game = await Game.findById(gameId);
  if (!game || game.isActive === false) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  const filter = {
    gameId: game._id,
    isActive: true,
    status: 'available',
  };

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [resources, total] = await Promise.all([
    Resource.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Resource.countDocuments(filter),
  ]);

  return {
    resources: resources.map(formatCustomerResource),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

module.exports = {
  getPublicGames,
  getPublicGameById,
  getPublicGameResources,
};
