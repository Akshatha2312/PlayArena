/**
 * Client-side service for communicating with the Play Arena Backend AI Assistant API.
 * The browser NEVER communicates directly with the external LLM provider.
 */

const API_BASE_URL = '/api/v1/ai';

export async function sendChatMessage(message, messages = []) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message, messages })
    });

    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('AI Assistant is available exclusively to Play Arena customers.');
    }

    if (response.status === 429) {
      throw new Error('AI Assistant request limit exceeded. Please wait a few minutes before asking more questions.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'I\'m having trouble connecting right now. Please try again in a moment.');
    }

    return data.data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: You appear to be offline. The Play Arena Assistant requires an internet connection.');
    }
    throw error;
  }
}

export default {
  sendChatMessage
};
