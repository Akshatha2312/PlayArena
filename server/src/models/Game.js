const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Game name is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (val) {
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Game name cannot be empty',
      },
    },
    slug: {
      type: String,
      required: [true, 'Game slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'],
      validate: {
        validator: function (val) {
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Game slug cannot be empty',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['court', 'table', 'console', 'vr', 'simulator', 'arcade', 'other'],
        message: '{VALUE} is not a valid category',
      },
    },
    basePricePerHour: {
      type: Number,
      required: [true, 'Base price per hour is required'],
      min: [0, 'Base price per hour cannot be negative'],
    },
    minBookingDurationMinutes: {
      type: Number,
      required: [true, 'Minimum booking duration is required'],
      default: 30,
      min: [15, 'Minimum booking duration must be at least 15 minutes'],
      validate: {
        validator: function (val) {
          return typeof val === 'number' && val % 15 === 0;
        },
        message: 'Minimum booking duration must follow 15-minute increments',
      },
    },
    maxBookingDurationMinutes: {
      type: Number,
      required: [true, 'Maximum booking duration is required'],
      default: 240,
      validate: [
        {
          validator: function (val) {
            return typeof val === 'number' && val % 15 === 0;
          },
          message: 'Maximum booking duration must follow 15-minute increments',
        },
        {
          validator: function (val) {
            if (val === undefined || val === null) return true;
            const min = this.minBookingDurationMinutes !== undefined ? this.minBookingDurationMinutes : 30;
            return val >= min;
          },
          message: 'Maximum booking duration must be greater than or equal to minimum booking duration',
        },
      ],
    },
    bookingIntervalMinutes: {
      type: Number,
      required: [true, 'Booking interval is required'],
      default: 30,
      enum: {
        values: [15, 30, 60],
        message: '{VALUE} is not a valid booking interval (must be 15, 30, or 60)',
      },
    },
    minPlayers: {
      type: Number,
      default: 1,
      min: [1, 'Minimum players must be at least 1'],
    },
    maxPlayers: {
      type: Number,
      min: [1, 'Maximum players must be at least 1'],
      validate: {
        validator: function (val) {
          if (val === undefined || val === null) return true;
          const min = this.minPlayers !== undefined ? this.minPlayers : 1;
          return val >= min;
        },
        message: 'Maximum players must be greater than or equal to minimum players',
      },
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

gameSchema.index({ category: 1 });
gameSchema.index({ isActive: 1 });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
