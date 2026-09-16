const venueService = require('../services/venueService');

/**
 * Public venue layout handler
 */
const getPublicVenueLayout = async (req, res, next) => {
  try {
    const layout = await venueService.getPublicVenueLayout();
    return res.status(200).json({
      status: 'success',
      data: layout,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin venue layout handler
 */
const getAdminVenueLayout = async (req, res, next) => {
  try {
    const layout = await venueService.getAdminVenueLayout();
    return res.status(200).json({
      status: 'success',
      data: layout,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin resource location update handler
 */
const updateResourceLocation = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const updatedResource = await venueService.updateResourceLocation(resourceId, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Resource location updated successfully',
      data: { resource: updatedResource },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicVenueLayout,
  getAdminVenueLayout,
  updateResourceLocation,
};
