const resourceService = require('../services/resourceService');

/**
 * Handles HTTP POST request to create a new Resource under a Game.
 */
const createResource = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const resource = await resourceService.createResource(gameId, req.body || {});

    return res.status(201).json({
      status: 'success',
      message: 'Resource created successfully',
      data: {
        resource,
      },
    });
  } catch (error) {
    if (error.code === 11000 || (error.message && error.message.includes('duplicate'))) {
      return res.status(409).json({
        status: 'fail',
        message: 'A resource with this name under the same game or with this code already exists',
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
 * Handles HTTP GET request to list resources belonging to a Game with optional status/isActive filters.
 */
const getResourcesByGame = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { status, isActive, page, limit } = req.query || {};
    const result = await resourceService.getResourcesByGame(gameId, { status, isActive, page, limit });

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

/**
 * Handles HTTP GET request to retrieve a single Resource by ID.
 */
const getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await resourceService.getResourceById(id);

    return res.status(200).json({
      status: 'success',
      data: {
        resource,
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
 * Handles HTTP PATCH request for partial update of a Resource.
 */
const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedResource = await resourceService.updateResource(id, req.body || {});

    return res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      data: {
        resource: updatedResource,
      },
    });
  } catch (error) {
    if (error.code === 11000 || (error.message && error.message.includes('duplicate'))) {
      return res.status(409).json({
        status: 'fail',
        message: 'A resource with this name under the same game or with this code already exists',
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
 * Handles HTTP DELETE request to soft-delete a Resource (sets isActive = false).
 */
const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const softDeletedResource = await resourceService.deleteResource(id);

    return res.status(200).json({
      status: 'success',
      message: 'Resource deactivated successfully',
      data: {
        resource: softDeletedResource,
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
  createResource,
  getResourcesByGame,
  getResourceById,
  updateResource,
  deleteResource,
};
