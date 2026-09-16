const User = require('../models/User');

const getNotificationSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('name email phone notificationPreferences');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        phone: user.phone,
        notificationPreferences: user.notificationPreferences || {
          emailEnabled: true,
          inAppEnabled: true,
          whatsappEnabled: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateNotificationSettings = async (req, res, next) => {
  try {
    const { emailEnabled, inAppEnabled, whatsappEnabled, phone } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = { emailEnabled: true, inAppEnabled: true, whatsappEnabled: true };
    }

    if (emailEnabled !== undefined) user.notificationPreferences.emailEnabled = Boolean(emailEnabled);
    if (inAppEnabled !== undefined) user.notificationPreferences.inAppEnabled = Boolean(inAppEnabled);
    if (whatsappEnabled !== undefined) user.notificationPreferences.whatsappEnabled = Boolean(whatsappEnabled);

    if (phone !== undefined && typeof phone === 'string' && phone.trim()) {
      user.phone = phone.trim();
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification settings updated successfully',
      data: {
        phone: user.phone,
        notificationPreferences: user.notificationPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
};
