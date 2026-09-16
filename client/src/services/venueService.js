import { fetchApi } from './api';

export const venueService = {
  /**
   * Fetch public venue layout map data
   */
  getPublicVenueLayout: async () => {
    return await fetchApi('/venue/layout');
  },

  /**
   * Fetch admin venue layout map data
   */
  getAdminVenueLayout: async () => {
    return await fetchApi('/venue/admin/layout');
  },

  /**
   * Update physical location & map settings for a resource
   */
  updateResourceLocation: async (resourceId, locationData) => {
    return await fetchApi(`/venue/admin/resources/${resourceId}/location`, {
      method: 'PATCH',
      body: JSON.stringify(locationData),
    });
  },
};

export default venueService;
