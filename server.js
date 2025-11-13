const express = require('express');
const dgram = require('dgram');
const MeterData = require('./models/MeterData');
const Device = require('./models/Device');
const Node = require('./models/Node');
// --- UDP SERVER FOR DEVICE DATA ---
const UDP_PORT = process.env.UDP_PORT || 41234;
const udpServer = dgram.createSocket('udp4');

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
  udpServer.close();
});

udpServer.on('message', async (msg, rinfo) => {
  try {
    const data = JSON.parse(msg.toString());
    // Wisun packet: device, parent, ... plus meter values
    // Try to extract deviceId, nodeId, current, voltage, powerFactor, apparentPower
    // Accept both camelCase and snake_case for meter values
    const deviceId = data.device || data.deviceId;
    const nodeId = data.parent || data.nodeId;
    const current = data.current !== undefined ? data.current : data.Current;
    const voltage = data.voltage !== undefined ? data.voltage : data.Voltage;
    const powerFactor = data.powerFactor !== undefined ? data.powerFactor : data.PowerFactor;
    const apparentPower = data.apparentPower !== undefined ? data.apparentPower : data.ApparentPower;

    if (!deviceId || !nodeId || current === undefined || voltage === undefined || powerFactor === undefined || apparentPower === undefined) {
      console.warn('UDP: Missing required fields:', data);
      return;
    }
    // Validate device
    const device = await Device.findOne({ deviceId });
    if (!device) {
      console.warn('UDP: Device not found:', deviceId);
      return;
    }
    // Validate node (parent is the nodeId in this context)
    const node = await Node.findOne({ nodeId, deviceIdString: deviceId });
    if (!node) {
      console.warn('UDP: Node not found or not under device:', nodeId, deviceId);
      return;
    }
    // Save all fields (Wi-SUN and meter values)
    const meterData = new MeterData({
      deviceId,
      nodeId,
      current: parseFloat(current),
      voltage: parseFloat(voltage),
      powerFactor: parseFloat(powerFactor),
      apparentPower: parseFloat(apparentPower),
      chip: data.chip,
      parent: data.parent,
      running: data.running,
      connected: data.connected,
      disconnected: data.disconnected,
      connections: data.connections,
      availability: data.availability,
      connected_total: data.connected_total,
      disconnected_total: data.disconnected_total,
      Wisun_Data: data.Wisun_Data,
      neighbor_info: data.neighbor_info
    });
    await meterData.save();
    // Update device/node last seen
    await Device.findOneAndUpdate({ deviceId }, { lastSeen: Date.now() });
    await Node.findOneAndUpdate({ nodeId }, { lastDataReceived: Date.now() });
    // Emit via Socket.io
    io.emit('meterData', {
      deviceId,
      nodeId,
      current: parseFloat(current),
      voltage: parseFloat(voltage),
      powerFactor: parseFloat(powerFactor),
      apparentPower: parseFloat(apparentPower),
      chip: data.chip,
      parent: data.parent,
      running: data.running,
      connected: data.connected,
      disconnected: data.disconnected,
      connections: data.connections,
      availability: data.availability,
      connected_total: data.connected_total,
      disconnected_total: data.disconnected_total,
      Wisun_Data: data.Wisun_Data,
      neighbor_info: data.neighbor_info,
      timestamp: meterData.timestamp
    });
    console.log(`UDP: Meter data saved from ${deviceId}/${nodeId} (${rinfo.address}:${rinfo.port})`);
  } catch (err) {
    console.error('UDP: Error processing message:', err);
  }
});

udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log(`📡 UDP server listening on ${address.address}:${address.port}`);
});
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import routes
const deviceRoutes = require('./routes/deviceRoutes');
const nodeRoutes = require('./routes/nodeRoutes');
const meterRoutes = require('./routes/meterRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wisun_emeter';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });

  socket.on('requestLatestData', (data) => {
    console.log('📊 Client requested latest data:', data);
  });
});

// API Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/meter', meterRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Wisun E-meter Backend is running',
    timestamp: new Date(),
    connections: io.engine.clientsCount
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Wisun E-meter Backend API',
    version: '1.0.0',
    endpoints: {
      devices: '/api/devices',
      nodes: '/api/nodes',
      meter: '/api/meter',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;


server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Socket.io server is ready`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  udpServer.bind(UDP_PORT);
});

module.exports = { app, server, io };
