#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Redis Clone Demo Launcher');
console.log('============================\n');

console.log('🎯 Starting Redis API server with comprehensive sample data...');
console.log('📊 This will populate the Redis instances with:');
console.log('   • User accounts and sessions');
console.log('   • E-commerce product catalog');
console.log('   • Social media posts and engagement');
console.log('   • Gaming leaderboards and stats');
console.log('   • Financial trading data');
console.log('   • IoT sensor readings');
console.log('   • Application metrics and caches');
console.log('   • Configuration and feature flags');
console.log('   • Pub/sub channels with sample messages');
console.log('');

// Start the API server with sample data flag
const apiServer = spawn('node', ['apiServer.js', '--demo'], {
  stdio: 'inherit',
  cwd: __dirname
});

apiServer.on('error', (error) => {
  console.error('❌ Failed to start API server:', error);
  process.exit(1);
});

apiServer.on('close', (code) => {
  console.log(`\n🛑 API server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down demo...');
  apiServer.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down demo...');
  apiServer.kill('SIGTERM');
}); 