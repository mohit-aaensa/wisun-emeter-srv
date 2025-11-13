const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:5000/api';
const DEVICE_ID = '345678909876';
const NODE_IDS = ['NODE011', 'NODE012', 'NODE013','NODE014','NODE015'];
// const NODE_IDS = ['NODE_METER_003'];
const SEND_INTERVAL = 5000; // milliseconds

/**
 * Register the device with the backend
 */
async function registerDevice() {
  const url = `${BACKEND_URL}/devices/register`;
  const data = {
    deviceId: DEVICE_ID,
    deviceName: 'IoT Simulator Gateway',
    description: 'Simulated Wisun Gateway Device',
    ipAddress: '192.168.1.100',
    location: 'Test Environment'
  };

  try {
    const response = await axios.post(url, data);
    console.log(`✅ Device registered successfully: ${DEVICE_ID}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`ℹ️  Device already exists: ${DEVICE_ID}`);
      return true;
    }
    console.error(`❌ Failed to register device:`, error.message);
    return false;
  }
}

/**
 * Register a node with the backend
 */
async function registerNode(nodeId) {
  const url = `${BACKEND_URL}/nodes/register`;
  const data = {
    nodeId,
    nodeName: `Meter ${nodeId}`,
    deviceId: DEVICE_ID,
    description: `Simulated meter node ${nodeId}`,
    location: `Location ${nodeId}`
  };

  try {
    const response = await axios.post(url, data);
    console.log(`✅ Node registered successfully: ${nodeId}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`ℹ️  Node already exists: ${nodeId}`);
      return true;
    }
    console.error(`❌ Failed to register node ${nodeId}:`, error.message);
    return false;
  }
}

/**
 * Generate realistic meter data
 */
function generateMeterData(nodeId) {
  // Simulate realistic variations
  const baseVoltage = 230.0;
  const voltageVariation = Math.random() * 20 - 10;
  const voltage = parseFloat((baseVoltage + voltageVariation).toFixed(2));

  // Current varies based on load
  const current = parseFloat((Math.random() * 14 + 1).toFixed(2));

  // Power factor typically between 0.8 and 1.0
  const powerFactor = parseFloat((Math.random() * 0.2 + 0.8).toFixed(3));

  // Apparent power calculation (simplified)
  const apparentPower = parseFloat(((voltage * current * powerFactor) / 1000).toFixed(2));

  return {
    deviceId: DEVICE_ID,
    nodeId,
    current,
    voltage,
    powerFactor,
    apparentPower
  };
}

/**
 * Send meter data to the backend
 */
async function sendMeterData(data) {
  const url = `${BACKEND_URL}/meter/data`;

  try {
    const response = await axios.post(url, data);
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `[${timestamp}] ✅ Data sent for ${data.nodeId}: ` +
      `V=${data.voltage}V, I=${data.current}A, ` +
      `PF=${data.powerFactor}, AP=${data.apparentPower}kWh`
    );
    return true;
  } catch (error) {
    console.error(`❌ Failed to send data:`, error.message);
    return false;
  }
}

/**
 * Main function to run the IoT simulator
 */
async function main() {
  console.log('='.repeat(60));
  console.log('IoT Device Simulator for Wisun E-Meter System');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Register device
  console.log('Step 1: Registering device...');
  const deviceRegistered = await registerDevice();
  if (!deviceRegistered) {
    console.log('Failed to register device. Exiting.');
    process.exit(1);
  }
  console.log();

  // Step 2: Register nodes
  console.log('Step 2: Registering nodes...');
  for (const nodeId of NODE_IDS) {
    await registerNode(nodeId);
  }
  console.log();

  console.log(`Setup complete! Starting data transmission every ${SEND_INTERVAL / 1000} seconds...`);
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(60));
  console.log();

  // Step 3: Send data continuously
  setInterval(async () => {
    for (const nodeId of NODE_IDS) {
      const data = generateMeterData(nodeId);
      await sendMeterData(data);
    }
  }, SEND_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nSimulator stopped by user');
  console.log('='.repeat(60));
  process.exit(0);
});

// Run the simulator
main().catch((error) => {
  console.error('Error running simulator:', error);
  process.exit(1);
});
