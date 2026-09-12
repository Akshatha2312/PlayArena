const catalogService = require('../services/catalogService');

/**
 * Handles HTTP GET request to list public active Games with category filter & pagination.
 */
const getGames = async (req, res, next) => {
  try {
    const { category, page, limit } = req.query || {};
    const result = await catalogService.getPublicGames({ category, page, limit });

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
 * Handles HTTP GET request to retrieve a single active Game by ID for public catalog viewing.
 */
const getGameById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const game = await catalogService.getPublicGameById(id);

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
 * Handles HTTP GET request to list operational catalog Resources for an active Game.
 */
const getGameResources = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { page, limit } = req.query || {};
    const result = await catalogService.getPublicGameResources(gameId, { page, limit });

    return res.status(200).json({
      status: 'success',
      data: {
        resources: result.resources,
        pagination: result.pagination,
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
  getGames,
  getGameById,
  getGameResources,
};
