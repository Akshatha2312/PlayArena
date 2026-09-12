const mongoose = require('mongoose');
const Game = require('../models/Game');

/**
 * List of allowed editable fields for Game entity updates.
 */
const ALLOWED_GAME_FIELDS = [
  'name',
  'slug',
  'description',
  'category',
  'basePricePerHour',
  'minBookingDurationMinutes',
  'maxBookingDurationMinutes',
  'bookingIntervalMinutes',
  'minPlayers',
  'maxPlayers',
  'imageUrl',
  'isActive',
];

/**
 * Creates a new Game catalog item.
 * @param {Object} gameData
 * @returns {Promise<Object>} Created Game document
 */
const createGame = async (gameData) => {
  // Enforce allowed fields only
  const filteredData = {};
  ALLOWED_GAME_FIELDS.forEach((field) => {
    if (gameData[field] !== undefined) {
      filteredData[field] = gameData[field];
    }
  });

  const game = new Game(filteredData);
  const savedGame = await game.save();
  return savedGame;
};

/**
 * Retrieves games list with optional filtering and basic pagination.
 * @param {Object} queryOptions - { category, isActive, page, limit }
 * @returns {Promise<Object>} { games, pagination: { total, page, limit, totalPages } }
 */
const getAllGames = async (queryOptions = {}) => {
  const filter = {};

  if (queryOptions.category) {
    filter.category = queryOptions.category;
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

  const [games, total] = await Promise.all([
    Game.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Game.countDocuments(filter),
  ]);

  return {
    games,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single Game by ID.
 * @param {String} gameId
 * @returns {Promise<Object>} Game document
 */
const getGameById = async (gameId) => {
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

  return game;
};

/**
 * Updates an existing Game document partially.
 * @param {String} gameId
 * @param {Object} updateData
 * @returns {Promise<Object>} Updated Game document
 */
const updateGame = async (gameId, updateData) => {
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

  // Assign only explicitly allowed fields
  ALLOWED_GAME_FIELDS.forEach((field) => {
    if (updateData[field] !== undefined) {
      game[field] = updateData[field];
    }
  });

  // Saving triggers full Mongoose schema validation & cross-field checks
  const updatedGame = await game.save();
  return updatedGame;
};

/**
 * Soft-deletes a Game document by setting isActive = false.
 * Does NOT physically delete document or touch resources.
 * @param {String} gameId
 * @returns {Promise<Object>} Soft-deleted Game document
 */
const deleteGame = async (gameId) => {
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

  game.isActive = false;
  const softDeletedGame = await game.save();
  return softDeletedGame;
};

module.exports = {
  createGame,
  getAllGames,
  getGameById,
  updateGame,
  deleteGame,
};
