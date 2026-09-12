const gameService = require('../services/gameService');

/**
 * Handles HTTP POST request to create a new Game catalog entity.
 */
const createGame = async (req, res, next) => {
  try {
    const game = await gameService.createGame(req.body || {});

    return res.status(201).json({
      status: 'success',
      message: 'Game created successfully',
      data: {
        game,
      },
    });
  } catch (error) {
    if (error.code === 11000 || (error.message && error.message.includes('duplicate'))) {
      return res.status(409).json({
        status: 'fail',
        message: 'A game with this name or slug already exists',
      });
    }

    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP GET request to list games with category/isActive filters and pagination.
 */
const getAllGames = async (req, res, next) => {
  try {
    const { category, isActive, page, limit } = req.query || {};
    const result = await gameService.getAllGames({ category, isActive, page, limit });

    return res.status(200).json({
      status: 'success',
      data: {
        games: result.games,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles HTTP GET request to retrieve a single Game by ID.
 */
const getGameById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const game = await gameService.getGameById(id);

    return res.status(200).json({
      status: 'success',
      data: {
        game,
      },
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP PATCH request for partial update of a Game catalog entity.
 */
const updateGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedGame = await gameService.updateGame(id, req.body || {});

    return res.status(200).json({
      status: 'success',
      message: 'Game updated successfully',
      data: {
        game: updatedGame,
      },
    });
  } catch (error) {
    if (error.code === 11000 || (error.message && error.message.includes('duplicate'))) {
      return res.status(409).json({
        status: 'fail',
        message: 'A game with this name or slug already exists',
      });
    }

    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP DELETE request to soft-delete a Game (sets isActive = false).
 */
const deleteGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const softDeletedGame = await gameService.deleteGame(id);

    return res.status(200).json({
      status: 'success',
      message: 'Game deactivated successfully',
      data: {
        game: softDeletedGame,
      },
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = {
  createGame,
  getAllGames,
  getGameById,
  updateGame,
  deleteGame,
};
