const mongoose = require("mongoose");

const meterDataSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    nodeId: {
      type: String,
      required: true,
      index: true,
    },
    current: {
      type: Number,
      required: true,
      description: "Line current drawn in Amperes (A)",
    },
    voltage: {
      type: Number,
      required: true,
      description: "RMS voltage in Volts (V)",
    },
    powerFactor: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      description: "Ratio of real to apparent power",
    },
    apparentPower: {
      type: Number,
      required: true,
      description: "Energy consumption over time in kWh",
    },
    // Wi-SUN extra fields
    chip: { type: String },
    parent: { type: String },
    running: { type: String },
    connected: { type: String },
    disconnected: { type: String },
    connections: { type: String },
    availability: { type: String },
    connected_total: { type: String },
    disconnected_total: { type: String },
    Wisun_Data: { type: String },
    neighbor_info: {
      rsl_in: { type: Number },
      rsl_out: { type: Number },
      is_lfn: { type: Number }
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
meterDataSchema.index({ deviceId: 1, nodeId: 1, timestamp: -1 });

// Automatically delete data older than 30 days
meterDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("MeterData", meterDataSchema);
