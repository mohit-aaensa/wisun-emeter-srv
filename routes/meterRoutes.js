const express = require('express');
const router = express.Router();
const MeterData = require('../models/MeterData');
const Node = require('../models/Node');
const Device = require('../models/Device');

// Receive meter data from IoT device via HTTP POST
router.post('/data', async (req, res) => {
  try {
    // Accept both old and new (Wi-SUN) formats
    const body = req.body;
    const deviceId = body.deviceId || body.device;
    const nodeId = body.nodeId || body.parent;
    const current = body.current !== undefined ? body.current : body.Current;
    const voltage = body.voltage !== undefined ? body.voltage : body.Voltage;
    const powerFactor = body.powerFactor !== undefined ? body.powerFactor : body.PowerFactor;
    const apparentPower = body.apparentPower !== undefined ? body.apparentPower : body.ApparentPower;

    // Validate required fields
    if (!deviceId || !nodeId || current === undefined || voltage === undefined || 
        powerFactor === undefined || apparentPower === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: deviceId, nodeId, current, voltage, powerFactor, apparentPower'
      });
    }

    // Verify device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Please register the device first.'
      });
    }

    // Verify node exists and belongs to the device
    const node = await Node.findOne({ nodeId, deviceIdString: deviceId });
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found or does not belong to this device.'
      });
    }

    // Save all fields (Wi-SUN and meter values)
    const meterData = new MeterData({
      deviceId,
      nodeId,
      current: parseFloat(current),
      voltage: parseFloat(voltage),
      powerFactor: parseFloat(powerFactor),
      apparentPower: parseFloat(apparentPower),
      chip: body.chip,
      parent: body.parent,
      running: body.running,
      connected: body.connected,
      disconnected: body.disconnected,
      connections: body.connections,
      availability: body.availability,
      connected_total: body.connected_total,
      disconnected_total: body.disconnected_total,
      Wisun_Data: body.Wisun_Data,
      neighbor_info: body.neighbor_info
    });

    await meterData.save();

    // Update device and node last seen timestamps
    await Device.findOneAndUpdate(
      { deviceId },
      { lastSeen: Date.now() }
    );

    await Node.findOneAndUpdate(
      { nodeId },
      { lastDataReceived: Date.now() }
    );

    // Emit data via Socket.io (accessed from req.app.get('io'))
    const io = req.app.get('io');
    if (io) {
      io.emit('meterData', {
        deviceId,
        nodeId,
        current: parseFloat(current),
        voltage: parseFloat(voltage),
        powerFactor: parseFloat(powerFactor),
        apparentPower: parseFloat(apparentPower),
        chip: body.chip,
        parent: body.parent,
        running: body.running,
        connected: body.connected,
        disconnected: body.disconnected,
        connections: body.connections,
        availability: body.availability,
        connected_total: body.connected_total,
        disconnected_total: body.disconnected_total,
        Wisun_Data: body.Wisun_Data,
        neighbor_info: body.neighbor_info,
        timestamp: meterData.timestamp
      });
    }

    res.status(201).json({
      success: true,
      message: 'Meter data received successfully',
      data: meterData
    });
  } catch (error) {
    console.error('Error receiving meter data:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing meter data',
      error: error.message
    });
  }
});

// Get latest meter data for a specific node
router.get('/latest/:deviceId/:nodeId', async (req, res) => {
  try {
    const { deviceId, nodeId } = req.params;
    
    const latestData = await MeterData.findOne({ deviceId, nodeId })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: 'No data found for this device and node'
      });
    }

    res.json({
      success: true,
      data: latestData
    });
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching latest data',
      error: error.message
    });
  }
});

// Get historical meter data for a specific node
router.get('/history/:deviceId/:nodeId', async (req, res) => {
  try {
    const { deviceId, nodeId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    let query = { deviceId, nodeId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const historicalData = await MeterData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: historicalData.length,
      data: historicalData
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching historical data',
      error: error.message
    });
  }
});

// Get all latest data for a device (all nodes)
router.get('/device/:deviceId/latest', async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Get all nodes for this device
    const nodes = await Node.find({ deviceIdString: deviceId });
    
    if (nodes.length === 0) {
      return res.json({
        success: true,
        message: 'No nodes found for this device',
        data: []
      });
    }

    // Get latest data for each node
    const latestDataPromises = nodes.map(node =>
      MeterData.findOne({ deviceId, nodeId: node.nodeId })
        .sort({ timestamp: -1 })
        .limit(1)
    );

    const latestDataArray = await Promise.all(latestDataPromises);
    const filteredData = latestDataArray.filter(data => data !== null);

    res.json({
      success: true,
      count: filteredData.length,
      data: filteredData
    });
  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching device data',
      error: error.message
    });
  }
});

module.exports = router;
