const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Node = require('../models/Node');

// Register a new device
router.post('/register', async (req, res) => {
  try {
    const { deviceId, deviceName, description, ipAddress, location } = req.body;

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Device with this ID already exists' 
      });
    }

    const device = new Device({
      deviceId,
      deviceName,
      description,
      ipAddress,
      location
    });
    
    await device.save();
    
    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: device
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering device',
      error: error.message
    });
  }
});

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ registeredAt: -1 });
    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message
    });
  }
});

// Get device by ID
router.get('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching device',
      error: error.message
    });
  }
});

// Update device status
router.patch('/:deviceId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      { status, lastSeen: Date.now() },
      { new: true }
    );
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Device status updated',
      data: device
    });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating device',
      error: error.message
    });
  }
});

// Delete device
router.delete('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOneAndDelete({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    // Also delete all nodes associated with this device
    await Node.deleteMany({ deviceIdString: req.params.deviceId });
    
    res.json({
      success: true,
      message: 'Device and associated nodes deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting device',
      error: error.message
    });
  }
});
// Update device details
router.patch('/:deviceId', async (req, res) => {
  try {
    const updateFields = {};
    const allowed = ['deviceName', 'description', 'ipAddress', 'location'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      updateFields,
      { new: true }
    );
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({ success: true, message: 'Device updated', data: device });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ success: false, message: 'Error updating device', error: error.message });
  }
});

module.exports = router;
