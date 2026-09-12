const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: [true, 'Game reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      validate: {
        validator: function (val) {
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Resource name cannot be empty',
      },
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
    },
    status: {
      type: String,
      required: [true, 'Resource status is required'],
      enum: {
        values: ['available', 'maintenance', 'out_of_service'],
        message: '{VALUE} is not a valid status',
      },
      default: 'available',
    },
    customPricePerHour: {
      type: Number,
      min: [0, 'Custom price per hour cannot be negative'],
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
    },
    locationNote: {
      type: String,
      trim: true,
      maxlength: [200, 'Location note cannot exceed 200 characters'],
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

// Compound Unique Index: Prevents duplicate resource names within the same Game (e.g., two "Court 1"s in Badminton)
resourceSchema.index({ gameId: 1, name: 1 }, { unique: true });

// Compound Index: Speeds up availability & query lookups for active, operational units belonging to a Game
resourceSchema.index({ gameId: 1, isActive: 1, status: 1 });

// Sparse unique index for optional inventory tag code
resourceSchema.index({ code: 1 }, { unique: true, sparse: true });

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
