const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const Game = require('../models/Game');

/**
 * Retrieves public-facing venue layout data grouped by floor and zone.
 * Only returns active games and active, visible resources on map.
 */
const getPublicVenueLayout = async () => {
  let resources = [];
  let games = [];

  try {
    [resources, games] = await Promise.all([
      Resource.find({ isActive: true, isVisibleOnMap: true })
        .populate('gameId', 'name slug category basePricePerHour imageUrl isActive')
        .sort({ floor: 1, zone: 1, positionOrder: 1, name: 1 }),
      Game.find({ isActive: true }).select('name slug category basePricePerHour imageUrl isActive'),
    ]);
  } catch (err) {
    resources = [];
    games = [];
  }

  // Filter out any resources whose parent game is inactive or missing
  const activeResources = resources.filter((r) => r.gameId && r.gameId.isActive !== false);

  // Build unique floors & zones lists
  const floors = Array.from(new Set(activeResources.map((r) => r.floor || 'Ground Floor')));
  if (floors.length === 0) floors.push('Ground Floor');

  const zones = Array.from(new Set(activeResources.map((r) => r.zone || 'Main Arena')));

  // Format resources with safe fields only
  const formattedResources = activeResources.map((r) => ({
    _id: r._id,
    gameId: r.gameId._id,
    gameName: r.gameId.name,
    gameSlug: r.gameId.slug,
    category: r.gameId.category,
    name: r.name,
    displayLabel: r.displayLabel || r.name,
    code: r.code || '',
    status: r.status, // operational status: available | maintenance | out_of_service
    customPricePerHour: r.customPricePerHour,
    effectivePricePerHour: r.customPricePerHour !== undefined && r.customPricePerHour !== null ? r.customPricePerHour : r.gameId.basePricePerHour,
    capacity: r.capacity || 1,
    locationNote: r.locationNote || '',
    floor: r.floor || 'Ground Floor',
    zone: r.zone || 'Main Arena',
    positionOrder: r.positionOrder || 1,
    mapCoordinates: r.mapCoordinates || { x: 50, y: 50 },
    isVisibleOnMap: r.isVisibleOnMap !== false,
  }));

  return {
    venueName: 'Play Arena Main Center',
    floors,
    zones,
    games,
    resources: formattedResources,
  };
};

/**
 * Retrieves full venue layout metadata for Admin Control Center.
 * Includes inactive and hidden resources.
 */
const getAdminVenueLayout = async () => {
  let resources = [];
  let games = [];

  try {
    [resources, games] = await Promise.all([
      Resource.find()
        .populate('gameId', 'name slug category basePricePerHour isActive')
        .sort({ floor: 1, zone: 1, positionOrder: 1, name: 1 }),
      Game.find().select('name slug category basePricePerHour isActive'),
    ]);
  } catch (err) {
    resources = [];
    games = [];
  }

  const floors = Array.from(new Set(resources.map((r) => r.floor || 'Ground Floor')));
  if (floors.length === 0) floors.push('Ground Floor');

  const zones = Array.from(new Set(resources.map((r) => r.zone || 'Main Arena')));

  const formattedResources = resources.map((r) => ({
    _id: r._id,
    gameId: r.gameId ? r.gameId._id : null,
    gameName: r.gameId ? r.gameId.name : 'Unknown Game',
    category: r.gameId ? r.gameId.category : 'other',
    name: r.name,
    displayLabel: r.displayLabel || r.name,
    code: r.code || '',
    status: r.status,
    customPricePerHour: r.customPricePerHour,
    capacity: r.capacity || 1,
    locationNote: r.locationNote || '',
    floor: r.floor || 'Ground Floor',
    zone: r.zone || 'Main Arena',
    positionOrder: r.positionOrder || 1,
    mapCoordinates: r.mapCoordinates || { x: 50, y: 50 },
    isVisibleOnMap: r.isVisibleOnMap !== false,
    isActive: r.isActive !== false,
  }));

  return {
    venueName: 'Play Arena Main Center',
    floors,
    zones,
    games,
    resources: formattedResources,
  };
};

/**
 * Updates physical location & map metadata for a specific Resource.
 */
const updateResourceLocation = async (resourceId, locationData) => {
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

  if (locationData.floor !== undefined) {
    resource.floor = String(locationData.floor).trim();
  }
  if (locationData.zone !== undefined) {
    resource.zone = String(locationData.zone).trim();
  }
  if (locationData.positionOrder !== undefined) {
    const pos = parseInt(locationData.positionOrder, 10);
    if (!isNaN(pos) && pos >= 1) {
      resource.positionOrder = pos;
    }
  }
  if (locationData.displayLabel !== undefined) {
    resource.displayLabel = String(locationData.displayLabel).trim();
  }
  if (locationData.isVisibleOnMap !== undefined) {
    resource.isVisibleOnMap = Boolean(locationData.isVisibleOnMap);
  }
  if (locationData.mapCoordinates !== undefined && typeof locationData.mapCoordinates === 'object') {
    const x = Math.max(0, Math.min(100, Number(locationData.mapCoordinates.x) || 50));
    const y = Math.max(0, Math.min(100, Number(locationData.mapCoordinates.y) || 50));
    resource.mapCoordinates = { x, y };
  }

  await resource.save();

  // Notify socket subscribers if IO is attached
  const socketService = require('./socketService');
  if (socketService && typeof socketService.broadcastVenueLayoutUpdated === 'function') {
    socketService.broadcastVenueLayoutUpdated({
      resourceId: resource._id,
      floor: resource.floor,
      zone: resource.zone,
    });
  }

  return resource;
};

module.exports = {
  getPublicVenueLayout,
  getAdminVenueLayout,
  updateResourceLocation,
};
