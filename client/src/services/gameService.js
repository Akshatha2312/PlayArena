import { fetchApi } from './api';

export const gameService = {
  getGames: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/games${queryString ? `?${queryString}` : ''}`);
  },

  getGameById: async (id) => {
    return fetchApi(`/games/${id}`);
  },

  getGameResources: async (gameId) => {
    return fetchApi(`/games/${gameId}/resources`);
  },

  checkAvailability: async (gameId, resourceId, params) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/games/${gameId}/resources/${resourceId}/availability?${queryString}`);
  },
};
