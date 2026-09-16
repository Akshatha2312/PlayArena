const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportIssue',
      required: [true, 'Support issue reference is required'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
      index: true,
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['customer', 'staff', 'admin'],
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      validate: {
        validator: function (val) {
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Message content cannot be empty',
      },
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

supportMessageSchema.index({ issueId: 1, createdAt: 1 });

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);

module.exports = SupportMessage;
