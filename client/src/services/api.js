const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Centralized fetch helper for Play Arena API calls.
 */
export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('play_arena_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Automatically clear token on 401 Unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('play_arena_token');
      localStorage.removeItem('play_arena_user');
    }
    const error = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
