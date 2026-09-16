const aiService = require('../services/aiService');

/**
 * Handle POST /api/v1/ai/chat requests from authenticated customers.
 */
async function processChat(req, res, next) {
  try {
    const userId = req.user && (req.user.userId || req.user._id || req.user.id);
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }

    const { message, messages } = req.body;

    let chatMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
    } else if (typeof message === 'string' && message.trim().length > 0) {
      chatMessages = [{ role: 'user', content: message.trim() }];
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Message content is required'
      });
    }

    // Input bounds check: limit individual message length to prevent token abuse
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && typeof lastMsg.content === 'string' && lastMsg.content.length > 1000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Message length exceeds maximum allowed limit of 1000 characters.'
      });
    }

    const response = await aiService.chatWithAssistant(userId, chatMessages);

    return res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    console.error('[AI Controller Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'I\'m having trouble connecting to the Play Arena Assistant right now. Please try again in a moment.'
    });
  }
}

module.exports = {
  processChat
};
