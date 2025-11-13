import { Schema, model } from "mongoose";

const levelSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    // e.g., "L0", "L1", "L2", "Beginner", "Intermediate", "Advanced"
  },
  order: {
    type: Number,
    required: true,
    min: 0,
  },
  completionTimeframe: {
    minDays: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxDays: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  color: {
    type: String,
    default: "#3B82F6", // Default blue color
    trim: true,
  },
}, { _id: false });

const courseLevelConfigSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: "Default Course Level Configuration",
    },
    description: {
      type: String,
      default: "System-wide course level configuration",
      trim: true,
    },
    levels: {
      type: [levelSchema],
      required: true,
      validate: {
        validator: function(levels) {
          // Ensure at least one level exists
          if (levels.length === 0) {
            return false;
          }
          // Ensure orders are unique and sequential
          const orders = levels.map(l => l.order);
          const uniqueOrders = [...new Set(orders)];
          if (orders.length !== uniqueOrders.length) {
            return false;
          }
          // Ensure level names are unique
          const names = levels.map(l => l.name.toUpperCase());
          const uniqueNames = [...new Set(names)];
          if (names.length !== uniqueNames.length) {
            return false;
          }
          // Ensure minDays <= maxDays for each level
          for (const level of levels) {
            if (level.completionTimeframe.minDays > level.completionTimeframe.maxDays) {
              return false;
            }
          }
          return true;
        },
        message: "Levels must have unique names and orders, and minDays must be <= maxDays",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
courseLevelConfigSchema.index({ isActive: 1, isDefault: 1 });

// Ensure only one default configuration exists
courseLevelConfigSchema.pre("save", async function (next) {
  if (this.isDefault) {
    // If this is being set as default, unset all others
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  
  // Sort levels by order
  if (this.levels && this.levels.length > 0) {
    this.levels.sort((a, b) => a.order - b.order);
  }
  
  next();
});

// Static method to get the active configuration
courseLevelConfigSchema.statics.getActiveConfig = async function() {
  // Try to get the default active configuration
  let config = await this.findOne({ isActive: true, isDefault: true });
  
  // If no default, get any active configuration
  if (!config) {
    config = await this.findOne({ isActive: true }).sort({ createdAt: -1 });
  }
  
  // If still no config, create a default one with L1, L2, L3
  if (!config) {
    config = await this.create({
      name: "Default Configuration",
      description: "Default 3-level system (L1, L2, L3)",
      isDefault: true,
      isActive: true,
      levels: [
        {
          name: "L1",
          order: 0,
          completionTimeframe: { minDays: 1, maxDays: 4 },
          description: "Beginner Level",
          color: "#3B82F6", // Blue
        },
        {
          name: "L2",
          order: 1,
          completionTimeframe: { minDays: 5, maxDays: 8 },
          description: "Intermediate Level",
          color: "#F97316", // Orange
        },
        {
          name: "L3",
          order: 2,
          completionTimeframe: { minDays: 9, maxDays: 12 },
          description: "Advanced Level",
          color: "#10B981", // Green
        },
      ],
    });
  }
  
  return config;
};

// Static method to validate if a level name exists in active configuration
courseLevelConfigSchema.statics.isValidLevel = async function(levelName) {
  const config = await this.getActiveConfig();
  if (!config) return false;
  
  return config.levels.some(level => 
    level.name.toUpperCase() === levelName.toUpperCase()
  );
};

// Static method to get level by name
courseLevelConfigSchema.statics.getLevelByName = async function(levelName) {
  const config = await this.getActiveConfig();
  if (!config) return null;
  
  return config.levels.find(level => 
    level.name.toUpperCase() === levelName.toUpperCase()
  );
};

// Instance method to get next level
courseLevelConfigSchema.methods.getNextLevel = function(currentLevelName) {
  if (!currentLevelName) return this.levels[0];
  
  const currentLevel = this.levels.find(
    level => level.name.toUpperCase() === currentLevelName.toUpperCase()
  );
  
  if (!currentLevel) return null;
  
  // Find next level by order
  const nextLevel = this.levels.find(
    level => level.order === currentLevel.order + 1
  );
  
  return nextLevel || null;
};

// Instance method to get previous level
courseLevelConfigSchema.methods.getPreviousLevel = function(currentLevelName) {
  const currentLevel = this.levels.find(
    level => level.name.toUpperCase() === currentLevelName.toUpperCase()
  );
  
  if (!currentLevel || currentLevel.order === 0) return null;
  
  // Find previous level by order
  const previousLevel = this.levels.find(
    level => level.order === currentLevel.order - 1
  );
  
  return previousLevel || null;
};

export default model("CourseLevelConfig", courseLevelConfigSchema);
