
const express = require('express');
const router = express.Router();
const Node = require('../models/Node');
const Device = require('../models/Device');

// Update node details
router.patch('/:nodeId', async (req, res) => {
  try {
    const updateFields = {};
    const allowed = ['nodeName', 'description', 'location'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });
    const node = await Node.findOneAndUpdate(
      { nodeId: req.params.nodeId },
      updateFields,
      { new: true }
    );
    if (!node) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }
    res.json({ success: true, message: 'Node updated', data: node });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ success: false, message: 'Error updating node', error: error.message });
  }
});

// Register a new node
router.post('/register', async (req, res) => {
  try {
    const { nodeId, nodeName, deviceId, description, location } = req.body;

    // Check if device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Please register the device first.'
      });
    }

    // Check if node already exists
    const existingNode = await Node.findOne({ nodeId });
    if (existingNode) {
      return res.status(400).json({
        success: false,
        message: 'Node with this ID already exists'
      });
    }

    const node = new Node({
      nodeId,
      nodeName,
      deviceId: device._id,
      deviceIdString: deviceId,
      description,
      location
    });

    await node.save();

    res.status(201).json({
      success: true,
      message: 'Node registered successfully',
      data: node
    });
  } catch (error) {
    console.error('Error registering node:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering node',
      error: error.message
    });
  }
});

// Get all nodes
router.get('/', async (req, res) => {
  try {
    const nodes = await Node.find().populate('deviceId').sort({ registeredAt: -1 });
    res.json({
      success: true,
      count: nodes.length,
      data: nodes
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nodes',
      error: error.message
    });
  }
});

// Get nodes by device ID
router.get('/device/:deviceId', async (req, res) => {
  try {
    const nodes = await Node.find({ deviceIdString: req.params.deviceId })
      .populate('deviceId')
      .sort({ registeredAt: -1 });
    
    res.json({
      success: true,
      count: nodes.length,
      data: nodes
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nodes',
      error: error.message
    });
  }
});

// Get node by ID
router.get('/:nodeId', async (req, res) => {
  try {
    const node = await Node.findOne({ nodeId: req.params.nodeId }).populate('deviceId');
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }
    res.json({
      success: true,
      data: node
    });
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching node',
      error: error.message
    });
  }
});

// Update node status
router.patch('/:nodeId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const node = await Node.findOneAndUpdate(
      { nodeId: req.params.nodeId },
      { status, lastDataReceived: Date.now() },
      { new: true }
    );

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }

    res.json({
      success: true,
      message: 'Node status updated',
      data: node
    });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating node',
      error: error.message
    });
  }
});

// Delete node
router.delete('/:nodeId', async (req, res) => {
  try {
    const node = await Node.findOneAndDelete({ nodeId: req.params.nodeId });
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }

    res.json({
      success: true,
      message: 'Node deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting node',
      error: error.message
    });
  }
});

module.exports = router;
