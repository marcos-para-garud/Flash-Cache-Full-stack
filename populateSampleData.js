const SampleDataGenerator = require('./sampleDataGenerator');
const RedisClone = require('./redis');

class SampleDataPopulator {
  constructor() {
    this.generator = new SampleDataGenerator();
    this.redisInstances = new Map();
    this.ttlSchedulerInterval = null; // For storing the TTL scheduler interval
  }

  // Initialize Redis instances for different nodes
  initializeRedisInstances() {
    console.log('🔧 Initializing Redis instances...');
    
    // Create Redis instances for each node
    const nodeNames = ['node1', 'node2', 'node3'];
    
    nodeNames.forEach(nodeName => {
      const redis = new RedisClone(nodeName, 1000); // Increased max size for demo
      this.redisInstances.set(nodeName, redis);
      console.log(`✅ Initialized Redis instance: ${nodeName}`);
    });
  }

  // Determine which node a key should be stored on (consistent hashing simulation)
  getNodeForKey(key) {
    const { createHash } = require('crypto');
    const hash = createHash('sha256').update(key).digest('hex');
    const nodeIndex = parseInt(hash.substr(0, 8), 16) % 3;
    const nodeNames = ['node1', 'node2', 'node3'];
    return nodeNames[nodeIndex];
  }

  // Populate all Redis instances with sample data
  async populateData() {
    console.log('🚀 Starting sample data population...\n');
    
    // Generate sample data
    const sampleData = this.generator.generateAll();
    
    console.log('\n📥 Populating Redis instances...');
    
    // Track distribution
    const nodeStats = {
      node1: { keys: 0, ttlKeys: 0 },
      node2: { keys: 0, ttlKeys: 0 },
      node3: { keys: 0, ttlKeys: 0 }
    };

    // Populate Redis instances with generated data
    for (const [key, value] of sampleData.keys) {
      const targetNode = this.getNodeForKey(key);
      const redis = this.redisInstances.get(targetNode);
      
      if (redis) {
        const ttl = sampleData.ttl.has(key) ? 
          Math.floor((sampleData.ttl.get(key) - Date.now()) / 1000) : null;
        
        try {
          redis.set(key, value, ttl);
          nodeStats[targetNode].keys++;
          
          if (ttl) {
            nodeStats[targetNode].ttlKeys++;
          }
        } catch (error) {
          console.error(`❌ Error setting key ${key} on ${targetNode}:`, error.message);
        }
      }
    }

    // Create pub/sub channels
    console.log('\n📡 Setting up pub/sub channels...');
    for (const [channelName, channelData] of sampleData.channels) {
      // Add channel to each Redis instance
      this.redisInstances.forEach((redis, nodeName) => {
        redis.channels.set(channelName, {
          subscribers: new Set(),
          ...channelData
        });
      });
      console.log(`✅ Created channel: ${channelName}`);
    }

    // Generate some sample messages for pub/sub channels
    this.generateSampleMessages();

    // Print distribution statistics
    this.printDistributionStats(nodeStats);
    
    console.log('\n🎉 Sample data population complete!');
    
    return {
      totalKeys: sampleData.keys.size,
      ttlKeys: sampleData.ttl.size,
      channels: sampleData.channels.size,
      nodeDistribution: nodeStats
    };
  }

  // Generate sample pub/sub messages
  generateSampleMessages() {
    console.log('💬 Generating sample pub/sub messages...');
    
    const sampleMessages = [
      { channel: 'notifications', message: 'Welcome to Redis Monitor Demo!' },
      { channel: 'alerts', message: 'System monitoring active' },
      { channel: 'analytics', message: 'Daily report generated' },
      { channel: 'user_activity', message: 'User Alice logged in' },
      { channel: 'system_events', message: 'Cache refresh completed' },
      { channel: 'orders', message: 'New order #12345 received' },
      { channel: 'chat', message: 'Demo: Multi-user chat ready' },
      { channel: 'metrics_updates', message: 'Performance metrics updated' }
    ];

    sampleMessages.forEach(({ channel, message }) => {
      // Publish to the first Redis instance (node1) which can handle pub/sub
      const redis = this.redisInstances.get('node1');
      if (redis && redis.channels.has(channel)) {
        console.log(`📨 Sample message sent to ${channel}: ${message}`);
        // Note: In a real scenario, you'd publish these messages
        // redis.publish(channel, message);
      }
    });
  }

  // Print distribution statistics
  printDistributionStats(nodeStats) {
    console.log('\n📊 Data Distribution Statistics:');
    console.log('================================');
    
    let totalKeys = 0;
    let totalTTLKeys = 0;
    
    Object.entries(nodeStats).forEach(([nodeName, stats]) => {
      console.log(`${nodeName.toUpperCase()}:`);
      console.log(`  🔑 Keys: ${stats.keys}`);
      console.log(`  ⏰ TTL Keys: ${stats.ttlKeys}`);
      console.log(`  📈 Load: ${((stats.keys / 300) * 100).toFixed(1)}%`); // Assuming ~300 total keys
      console.log('');
      
      totalKeys += stats.keys;
      totalTTLKeys += stats.ttlKeys;
    });
    
    console.log('TOTALS:');
    console.log(`🔑 Total Keys: ${totalKeys}`);
    console.log(`⏰ Total TTL Keys: ${totalTTLKeys}`);
    console.log(`🔄 TTL Ratio: ${((totalTTLKeys / totalKeys) * 100).toFixed(1)}%`);
  }

  // Get Redis instance for a specific node
  getRedisInstance(nodeName) {
    return this.redisInstances.get(nodeName);
  }

  // Get all Redis instances
  getAllRedisInstances() {
    return Array.from(this.redisInstances.values());
  }

  // Generate live sample data (for real-time demo)
  generateLiveData() {
    console.log('🔄 Generating live sample data...');
    
    const liveMetrics = [
      'metrics:cpu_usage',
      'metrics:memory_usage', 
      'metrics:active_connections',
      'metrics:requests_per_second'
    ];

    const updateLiveMetrics = () => {
      liveMetrics.forEach(key => {
        const targetNode = this.getNodeForKey(key);
        const redis = this.redisInstances.get(targetNode);
        
        if (redis) {
          let value;
          switch (key) {
            case 'metrics:cpu_usage':
              value = (Math.random() * 100).toFixed(2);
              break;
            case 'metrics:memory_usage':
              value = (Math.random() * 8192).toFixed(0);
              break;
            case 'metrics:active_connections':
              value = Math.floor(Math.random() * 100 + 50).toString();
              break;
            case 'metrics:requests_per_second':
              value = Math.floor(Math.random() * 500 + 100).toString();
              break;
          }
          
          redis.set(key, value, 60); // 1 minute TTL
        }
      });
    };

    // Update metrics every 10 seconds
    updateLiveMetrics(); // Initial update
    setInterval(updateLiveMetrics, 10000);
    
    console.log('✅ Live metrics generation started (updates every 10 seconds)');
  }

  // Start TTL key refresh scheduler (every 10 hours)
  startTTLScheduler() {
    console.log('⏰ Starting long-term TTL key scheduler (10-hour intervals)...');
    
    const refreshLongTermKeys = async () => {
      console.log('🔄 Refreshing long-term TTL keys...');
      
      try {
        // Generate fresh long-term TTL data
        const generator = new (require('./sampleDataGenerator'))();
        generator.generateLongTermTTLData();
        
        const ttlData = generator.ttlData;
        const keyData = generator.data;
        
        let refreshedCount = 0;
        
        // Distribute the new TTL keys across nodes
        for (const [key, value] of keyData.entries()) {
          if (ttlData.has(key)) {
            const targetNode = this.getNodeForKey(key);
            const redis = this.redisInstances.get(targetNode);
            
            if (redis) {
              // Calculate TTL in seconds from expiry timestamp
              const ttlSeconds = Math.floor((ttlData.get(key) - Date.now()) / 1000);
              
              if (ttlSeconds > 0) {
                // Set the key with TTL
                redis.set(key, value);
                if (ttlSeconds > 0) {
                  redis.expire(key, ttlSeconds);
                }
                refreshedCount++;
              }
            }
          }
        }
        
        console.log(`✅ Refreshed ${refreshedCount} long-term TTL keys`);
        console.log(`⏰ Next refresh in 10 hours`);
        
      } catch (error) {
        console.error('❌ Error refreshing TTL keys:', error);
      }
    };
    
    // Initial refresh immediately
    refreshLongTermKeys();
    
    // Schedule refresh every 10 hours (36000000 milliseconds)
    const ttlInterval = setInterval(refreshLongTermKeys, 36000000);
    
    // Store interval reference for cleanup
    this.ttlSchedulerInterval = ttlInterval;
    
    console.log('✅ TTL key scheduler started (refreshes every 10 hours)');
  }

  // Cleanup method
  cleanup() {
    console.log('🧹 Cleaning up Redis instances...');
    
    // Clear TTL scheduler interval
    if (this.ttlSchedulerInterval) {
      clearInterval(this.ttlSchedulerInterval);
      console.log('✅ Stopped TTL scheduler');
    }
    
    this.redisInstances.forEach((redis, nodeName) => {
      if (redis.ttlWorker) {
        redis.ttlWorker.terminate();
      }
      if (redis.rdbWorker) {
        redis.rdbWorker.kill();
      }
      console.log(`✅ Cleaned up ${nodeName}`);
    });
  }
}

// Main execution function
async function main() {
  console.log('🚀 Redis Demo Sample Data Populator');
  console.log('====================================\n');
  
  const populator = new SampleDataPopulator();
  
  try {
    // Initialize Redis instances
    populator.initializeRedisInstances();
    
    // Populate with sample data
    const stats = await populator.populateData();
    
    // Start live data generation for demo purposes
    populator.generateLiveData();
    
    // Start TTL key refresh scheduler 
    populator.startTTLScheduler();
    
    console.log('\n🎯 Demo Environment Ready!');
    console.log('📈 Monitoring features now have rich sample data to display');
    console.log('🔄 Live metrics are updating every 10 seconds');
    console.log('⏰ Long-term TTL keys refresh every 10 hours');
    console.log('📡 Pub/sub channels are configured and ready');
    console.log('\n💡 You can now start the API server and UI to see the data');
    console.log('   Run: node apiServer.js');
    console.log('   Then: cd redis-ui && npm start');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      populator.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down...');
      populator.cleanup();
      process.exit(0);
    });
    
    return populator;
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = { SampleDataPopulator, main };

// Run if this file is executed directly
if (require.main === module) {
  main();
} 