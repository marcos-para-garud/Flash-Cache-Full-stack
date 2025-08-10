const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Master-Slave Replication Demo');
console.log('=====================================');

// Number of slave servers to start
const NUM_SLAVES = 3;
const slaves = [];

// Function to start a slave server
function startSlave(slaveId) {
  console.log(`📡 Starting Slave ${slaveId}...`);
  
  const slave = spawn('node', ['slaveServer.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
  });

  slave.stdout.on('data', (data) => {
    console.log(`[Slave ${slaveId}] ${data.toString().trim()}`);
  });

  slave.stderr.on('data', (data) => {
    console.error(`[Slave ${slaveId} ERROR] ${data.toString().trim()}`);
  });

  slave.on('close', (code) => {
    console.log(`❌ Slave ${slaveId} exited with code ${code}`);
  });

  slave.on('error', (err) => {
    console.error(`💥 Failed to start Slave ${slaveId}:`, err.message);
  });

  slaves.push({ id: slaveId, process: slave });
  return slave;
}

// Start multiple slaves
console.log(`🔄 Starting ${NUM_SLAVES} slave servers...`);
for (let i = 1; i <= NUM_SLAVES; i++) {
  setTimeout(() => startSlave(i), i * 1000); // Stagger starts by 1 second
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all slave servers...');
  slaves.forEach(slave => {
    console.log(`📴 Stopping Slave ${slave.id}`);
    slave.process.kill('SIGTERM');
  });
  
  setTimeout(() => {
    console.log('✅ All slaves stopped. Goodbye!');
    process.exit(0);
  }, 2000);
});

console.log('\n📋 Instructions:');
console.log('1. Make sure the API server is running: node apiServer.js');
console.log('2. Open the UI at http://localhost:3000');
console.log('3. Go to Master-Slave Replication tab');
console.log('4. Click "Start Master Server"');
console.log('5. Watch slaves connect automatically!');
console.log('\n💡 Press Ctrl+C to stop all slaves'); 