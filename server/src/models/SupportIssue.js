const mongoose = require('mongoose');

const supportIssueSchema = new mongoose.Schema(
  {
    issueNumber: {
      type: String,
      required: [true, 'Issue number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'booking',
          'payment',
          'refund',
          'venue',
          'game_resource',
          'check_in',
          'technical',
          'account',
          'invoice',
          'other',
        ],
        message: '{VALUE} is not a valid support category',
      },
      default: 'booking',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
      validate: {
        validator: function (val) {
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Subject cannot be empty',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      validate: {
        validator: function (val) {
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Description cannot be empty',
      },
    },
    priority: {
      type: String,
      required: true,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'open',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supportIssueSchema.index({ userId: 1, createdAt: -1 });
supportIssueSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportIssueSchema.index({ assignedTo: 1, status: 1 });

const SupportIssue = mongoose.model('SupportIssue', supportIssueSchema);

module.exports = SupportIssue;
