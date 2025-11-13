// iot_simulation_udp.js
// Simulate sending meter data to backend via UDP

const dgram = require('dgram');
const readline = require('readline');

const UDP_PORT = process.env.UDP_PORT || 41234;
const UDP_HOST = 'wisun-emeter.onrender.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// Use fixed deviceId and multiple nodeIds
const deviceId = '345678909876';
const NODE_IDS = ['NODE011', 'NODE012', 'NODE013','NODE014','NODE015'];

function generateRandomData(nodeId) {
  // Wi-SUN style packet with extra fields and meter values
  return {
    device: deviceId,
    chip: 'xG28',
    parent: nodeId,
    running: '0-00:03:03',
    connected: '0-00:02:09',
    disconnected: 'no',
    connections: '1',
    availability: '100.00',
    connected_total: '0-00:02:09',
    disconnected_total: '0-00:00:00',
    Wisun_Data: 'WiSUN-Board-20',
    // neighbor_info: { rsl_in: -34, rsl_out: -37, is_lfn: 5 },
    // Meter values
    current: (Math.random() * 10 + 1).toFixed(2),
    voltage: (Math.random() * 100 + 200).toFixed(2),
    powerFactor: (Math.random() * 0.5 + 0.5).toFixed(3),
    apparentPower: (Math.random() * 5 + 1).toFixed(2)
  };
}

function main() {
  const client = dgram.createSocket('udp4');

  function sendRandomDataAllNodes() {
    NODE_IDS.forEach(nodeId => {
      const data = generateRandomData(nodeId);
      const message = Buffer.from(JSON.stringify(data));
      client.send(message, UDP_PORT, UDP_HOST, (err) => {
        if (err) {
          console.error('UDP send error:', err);
        } else {
          console.log('Sent:', data);
        }
      });
    });
  }

  sendRandomDataAllNodes();
  // Send every 3 seconds
  setInterval(sendRandomDataAllNodes, 3000);
}

main();