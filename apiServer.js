const express = require("express");
const ClusterRedis = require("./ClusterRedis");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { SampleDataPopulator } = require("./populateSampleData");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://flashcache-ui.onrender.com", "https://your-frontend-domain.onrender.com"]
      : "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Create cluster instance
const cluster = new ClusterRedis(["node1", "node2", "node3"]);

// Track server statistics
const serverStats = {
  startTime: Date.now(),
  commandsExecuted: 0,
  connectedClients: 0,
  lastCpuUsage: process.cpuUsage(),
  lastCpuTime: Date.now()
};

// Helper function to increment command counter
function incrementCommandCounter() {
  serverStats.commandsExecuted++;
}

// Helper function to calculate CPU usage percentage
function calculateCpuUsage() {
  const currentTime = Date.now();
  const currentCpuUsage = process.cpuUsage();
  
  // Calculate time elapsed since last measurement
  const timeElapsed = currentTime - serverStats.lastCpuTime;
  
  // Calculate CPU time difference
  const cpuUsedUser = currentCpuUsage.user - serverStats.lastCpuUsage.user;
  const cpuUsedSystem = currentCpuUsage.system - serverStats.lastCpuUsage.system;
  const totalCpuUsed = cpuUsedUser + cpuUsedSystem;
  
  // Calculate CPU percentage (microseconds to percentage)
  const cpuPercent = timeElapsed > 0 ? Math.min(Math.round((totalCpuUsed / (timeElapsed * 1000)) * 100), 100) : 0;
  
  // Update last measurement
  serverStats.lastCpuUsage = currentCpuUsage;
  serverStats.lastCpuTime = currentTime;
  
  return Math.max(cpuPercent, 0);
}

// Helper function to determine appropriate HTTP status code based on error type
function getErrorStatusCode(error) {
  const errorMessage = error.message.toLowerCase();
  
  // Type mismatch errors should return 400 (Bad Request)
  if (errorMessage.includes('key is not a list') || 
      errorMessage.includes('wrongtype') || 
      errorMessage.includes('operation against a key holding the wrong kind of value')) {
    return 400;
  }
  
  // Key not found errors should return 404 (Not Found)
  if (errorMessage.includes('no such key')) {
    return 404;
  }
  
  // Value format errors should return 400 (Bad Request)
  if (errorMessage.includes('value is not a number') || 
      errorMessage.includes('hash value is not an integer')) {
    return 400;
  }
  
  // Default to 500 for other errors
  return 500;
}

// WebSocket subscription tracking
const subscriptions = new Map(); // channel -> Set of socket.id
const channelCallbacks = new Map(); // `${socket.id}_${channel}` -> callback
const channelNodes = new Map(); // `${socket.id}_${channel}` -> nodeName

// =========================
// Root Route
// =========================

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Flash Cache API Server", 
    version: "1.0.0",
    status: "running",
    description: "Redis-like in-memory key-value store with clustering, TTL, pub/sub, and replication",
    endpoints: {
      health: "/api/info",
      keys: "/api/keys", 
      stats: "/api/stats",
      serverStats: "/api/server-stats",
      monitoring: "/api/monitoring/stats",
      pubsub: "/api/pubsub/channels",
      replication: "/api/replication/status"
    },
    features: [
      "Clustered key-value storage",
      "TTL (Time-To-Live) support", 
      "Pub/Sub messaging",
      "Master-Slave replication",
      "Real-time monitoring",
      "WebSocket connections"
    ]
  });
});

// =========================
// Basic Key Operations
// =========================

// GET key
app.get("/api/keys/:key", (req, res) => {
  try {
    incrementCommandCounter();
    const { key } = req.params;
    const value = cluster.get(key);
    res.json({ success: true, data: { key, value } });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// SET key
app.post("/api/keys/:key/set", (req, res) => {
  try {
    incrementCommandCounter();
    const { key } = req.params;
    const { value, ttl } = req.body;
    const result = cluster.route(key).set(key, value, ttl);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// POST key (alternative set endpoint)
app.post("/api/keys", (req, res) => {
  try {
    incrementCommandCounter();
    const { key, value, ttl } = req.body;
    const result = cluster.route(key).set(key, value, ttl);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// DELETE key
app.delete("/api/keys/:key", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.delete(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Get all keys from all nodes
app.get("/api/keys", (req, res) => {
  try {
    incrementCommandCounter();
    const allKeys = new Set();
    
    // Get keys from all nodes
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const nodeKeys = node.keys();
      nodeKeys.forEach(key => allKeys.add(key));
    }
    
    const keys = Array.from(allKeys);
    res.json({ success: true, data: keys });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// TTL Operations
// =========================

// GET TTL
app.get("/api/keys/:key/ttl", (req, res) => {
  try {
    const { key } = req.params;
    const ttl = cluster.route(key).ttl(key);
    res.json({ success: true, data: ttl });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// SET TTL/EXPIRE
app.post("/api/keys/:key/expire", (req, res) => {
  try {
    const { key } = req.params;
    const { ttl } = req.body;
    const result = cluster.route(key).expire(key, ttl);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// Numeric Operations
// =========================

// INCREMENT
app.post("/api/keys/:key/incr", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.route(key).incr(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// DECREMENT
app.post("/api/keys/:key/decr", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.route(key).decr(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// Key Management
// =========================

// RENAME key
app.post("/api/keys/:key/rename", (req, res) => {
  try {
    const { key } = req.params;
    const { newKey } = req.body;
    const result = cluster.route(key).rename(key, newKey);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// EXISTS key
app.get("/api/keys/:key/exists", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.route(key).exists(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// List Operations
// =========================

// LPUSH
app.post("/api/keys/:key/lpush", (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const result = cluster.route(key).lpush(key, value);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// RPUSH
app.post("/api/keys/:key/rpush", (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const result = cluster.route(key).rpush(key, value);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// LPOP
app.post("/api/keys/:key/lpop", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.route(key).lpop(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// RPOP
app.post("/api/keys/:key/rpop", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.route(key).rpop(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// Hash Operations
// =========================

// HSET
app.post("/api/keys/:key/hset", (req, res) => {
  try {
    const { key } = req.params;
    const { field, value } = req.body;
    const result = cluster.route(key).hset(key, field, value);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// HGET
app.get("/api/keys/:key/hget/:field", (req, res) => {
  try {
    const { key, field } = req.params;
    const result = cluster.route(key).hget(key, field);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// HDEL
app.delete("/api/keys/:key/hget/:field", (req, res) => {
  try {
    const { key, field } = req.params;
    const result = cluster.route(key).hdel(key, field);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// HGETALL
app.get("/api/keys/:key/hgetall", (req, res) => {
  try {
    const { key } = req.params;
    const result = cluster.route(key).hgetall(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// HINCRBY
app.post("/api/keys/:key/hincrby", (req, res) => {
  try {
    const { key } = req.params;
    const { field, increment } = req.body;
    const result = cluster.route(key).hincrby(key, field, increment);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// Pub/Sub Operations
// =========================

// Get all channels
app.get("/api/pubsub/channels", (req, res) => {
  try {
    const channels = [];
    const channelSubscribers = new Map();
    
    // Get unique channels from WebSocket subscriptions (accurate count)
    for (const [channel, socketIds] of subscriptions.entries()) {
      channelSubscribers.set(channel, socketIds.size);
    }
    
    // Also check Redis nodes for channels that might exist but have no WebSocket subscribers
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      if (node.channels) {
        for (const [channelName, subscribers] of node.channels.entries()) {
          if (!channelSubscribers.has(channelName)) {
            channelSubscribers.set(channelName, 0); // No WebSocket subscribers
          }
        }
      }
    }
    
    // Convert to array format
    for (const [channelName, subscriberCount] of channelSubscribers.entries()) {
      channels.push({
        name: channelName,
        subscribers: subscriberCount,
        node: 'websocket'
      });
    }
    
    // If no channels found, add default chat channel
    if (channels.length === 0) {
      channels.push({
        name: 'chat',
        subscribers: 0,
        node: 'websocket'
      });
    }
    
    res.json({ success: true, data: channels });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Publish message to channel
app.post("/api/pubsub/publish", (req, res) => {
  try {
    const { channel, message } = req.body;
    
    // Publish to the specific node that handles this channel (node1)
    const targetNode = cluster.nodes.node1;
    let totalSubscribers = 0;
    
    if (targetNode) {
      totalSubscribers = targetNode.publish(channel, message);
    }
    
    // Emit to WebSocket clients in the channel room
    io.to(channel).emit('message', { channel, message, timestamp: new Date() });
    
    res.json({ success: true, data: { subscribers: totalSubscribers } });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// Server Information
// =========================

// Get server info
app.get("/api/info", (req, res) => {
  try {
    const info = {
      nodes: {},
      totalKeys: 0,
      totalChannels: 0
    };
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const nodeInfo = {
        keys: node.keys().length,
        channels: node.channels ? node.channels.size : 0,
        info: node.info()
      };
      info.nodes[nodeName] = nodeInfo;
      info.totalKeys += nodeInfo.keys;
      info.totalChannels += nodeInfo.channels;
    }
    
    res.json({ success: true, data: info });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Get cluster statistics
app.get("/api/stats", (req, res) => {
  try {
    const stats = {
      nodeDistribution: {},
      totalKeys: 0,
      totalChannels: 0
    };
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      stats.nodeDistribution[nodeName] = {
        keyCount: keys.length,
        keys: keys,
        channels: node.channels ? Array.from(node.channels.keys()) : []
      };
      stats.totalKeys += keys.length;
      stats.totalChannels += node.channels ? node.channels.size : 0;
    }
    
    res.json({ success: true, data: stats });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Get real server statistics
app.get("/api/server-stats", (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const currentTime = Date.now();
    
    // Get system memory info using os module
    const os = require('os');
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const usedSystemMemory = totalSystemMemory - freeSystemMemory;
    
    // Calculate uptime in a readable format
    const uptimeSeconds = Math.floor(uptime);
    const days = Math.floor(uptimeSeconds / (24 * 3600));
    const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    let uptimeString = '';
    if (days > 0) uptimeString += `${days}d `;
    if (hours > 0) uptimeString += `${hours}h `;
    if (minutes > 0) uptimeString += `${minutes}m `;
    uptimeString += `${seconds}s`;
    
    // Calculate commands per second (average since start)
    const runtimeSeconds = (currentTime - serverStats.startTime) / 1000;
    const commandsPerSecond = runtimeSeconds > 0 ? Math.round(serverStats.commandsExecuted / runtimeSeconds) : 0;
    
    // Get total keys from all nodes
    let totalKeys = 0;
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      totalKeys += node.keys().length;
    }
    
    // Calculate memory usage in MB
    const memoryUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
    const memoryTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(1);
    const systemMemoryUsedMB = (usedSystemMemory / 1024 / 1024).toFixed(1);
    const systemMemoryTotalMB = (totalSystemMemory / 1024 / 1024).toFixed(1);
    
    // Calculate CPU usage (approximation based on process.cpuUsage)
    const cpuPercent = calculateCpuUsage();
    
    const stats = {
      totalKeys,
      memoryUsed: `${systemMemoryUsedMB}MB`, // Use system memory instead of heap
      memoryTotal: `${systemMemoryTotalMB}MB`, // Use system memory instead of heap
      memoryPercent: Math.round((usedSystemMemory / totalSystemMemory) * 100), // Real system memory percentage
      heapUsed: `${memoryUsedMB}MB`, // Keep heap info as additional detail
      heapTotal: `${memoryTotalMB}MB`, // Keep heap info as additional detail
      heapPercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100), // Separate heap percentage
      connectedClients: serverStats.connectedClients,
      commandsPerSecond: commandsPerSecond,
      commandsExecuted: serverStats.commandsExecuted,
      uptime: uptimeString,
      uptimeSeconds: uptimeSeconds,
      version: process.version,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      cpuPercent: cpuPercent,
      replicationRole: 'master', // Since this is a standalone instance
      startTime: new Date(serverStats.startTime).toISOString(),
      currentTime: new Date(currentTime).toISOString()
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// FLUSH ALL
app.post("/api/flushall", (req, res) => {
  try {
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      node.flushAll();
    }
    res.json({ success: true, data: "All data flushed" });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// =========================
// Master-Slave Replication APIs
// =========================

// Start master server for replication demo
const net = require("net");
const RedisClone = require("./redis");

// Master instance for replication demo
const masterRedis = new RedisClone("master");
let masterServer = null;
let replicationLog = [];
let slaveConnections = new Map(); // slaveId -> {socket, status, lastSync}
let slaveStates = new Map(); // slaveId -> {keys: {}, status: 'connected'}

// Enhanced replication with logging
function logReplicationEvent(command, args, status = 'success') {
  const event = {
    id: Date.now() + Math.random(),
    timestamp: new Date(),
    command,
    args,
    status,
    affectedSlaves: slaveConnections.size
  };
  replicationLog.unshift(event);
  
  // Keep only last 100 events
  if (replicationLog.length > 100) {
    replicationLog = replicationLog.slice(0, 100);
  }
  
  // Emit to WebSocket clients
  io.emit('replication_event', event);
}

// Start master server
app.post("/api/replication/start-master", (req, res) => {
  try {
    if (masterServer) {
      return res.json({ success: true, message: "Master server already running", port: 7000 });
    }

    masterServer = net.createServer((socket) => {
      let slaveId = null; // Will be set by handshake
      let isHandshaken = false;
      
      console.log(`📡 Slave attempting to connect to master...`);
      
      const setupSlave = (id) => {
        slaveId = id;
        console.log(`📡 Slave connected to master: ${slaveId}`);
        
        slaveConnections.set(slaveId, {
          socket,
          status: 'connected',
          lastSync: new Date(),
          connectedAt: new Date()
        });
        
        slaveStates.set(slaveId, {
          keys: {},
          status: 'connected'
        });

        masterRedis.slaves.push(socket);
        
        // Send initial sync data to new slave
        const masterKeys = masterRedis.keys();
        masterKeys.forEach(key => {
          const value = masterRedis.get(key);
          const ttl = masterRedis.ttl(key);
          const syncCommand = { command: "set", args: [key, value, ttl > 0 ? ttl : null] };
          socket.write(JSON.stringify(syncCommand) + "\n");
        });

        logReplicationEvent('SLAVE_CONNECTED', [slaveId], 'success');
        isHandshaken = true;
      };
      
      socket.on('data', (data) => {
        const messages = data.toString().trim().split('\n');
        messages.forEach(msg => {
          if (!msg) return;
          
          try {
            const parsed = JSON.parse(msg);
            
            // Handle handshake
            if (parsed.type === 'handshake' && parsed.slaveId && !isHandshaken) {
              setupSlave(parsed.slaveId);
              return;
            }
            
            // Handle other slave messages if needed
            console.log(`📨 Received message from slave ${slaveId}:`, parsed);
            
          } catch (err) {
            // If no handshake received, fall back to old behavior
            if (!isHandshaken) {
              const fallbackId = `slave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              console.log(`⚠️ No handshake received, using fallback ID: ${fallbackId}`);
              setupSlave(fallbackId);
            }
          }
        });
      });

      socket.on("end", () => {
        if (slaveId) {
          console.log(`❌ Slave disconnected: ${slaveId}`);
          slaveConnections.delete(slaveId);
          slaveStates.delete(slaveId);
          
          // Remove from masterRedis.slaves array
          const index = masterRedis.slaves.indexOf(socket);
          if (index > -1) {
            masterRedis.slaves.splice(index, 1);
          }
          
          logReplicationEvent('SLAVE_DISCONNECTED', [slaveId], 'warning');
        }
      });

      socket.on("error", (err) => {
        if (slaveId) {
          console.error(`💥 Slave connection error (${slaveId}):`, err.message);
          slaveConnections.delete(slaveId);
          slaveStates.delete(slaveId);
          logReplicationEvent('SLAVE_ERROR', [slaveId, err.message], 'error');
        }
      });
    });

    const PORT = 7000;
    masterServer.listen(PORT, () => {
      console.log(`🚀 Master server started on port ${PORT}`);
      logReplicationEvent('MASTER_STARTED', [PORT], 'success');
    });

    // Override the replicate method to add logging
    const originalReplicate = masterRedis.replicate.bind(masterRedis);
    masterRedis.replicate = function(command, args) {
      logReplicationEvent(command.toUpperCase(), args, 'replicating');
      originalReplicate(command, args);
      
      // Update slave states (optimistic)
      slaveStates.forEach((state, slaveId) => {
        if (command === 'set') {
          state.keys[args[0]] = args[1];
        } else if (command === 'delete') {
          delete state.keys[args[0]];
        }
        state.lastSync = new Date();
      });
    };

    res.json({ success: true, message: "Master server started", port: PORT });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop master server
app.post("/api/replication/stop-master", (req, res) => {
  try {
    if (masterServer) {
      masterServer.close();
      masterServer = null;
      slaveConnections.clear();
      slaveStates.clear();
      logReplicationEvent('MASTER_STOPPED', [], 'warning');
    }
    res.json({ success: true, message: "Master server stopped" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get master keys
app.get("/api/replication/master/keys", (req, res) => {
  try {
    const keys = {};
    masterRedis.keys().forEach(key => {
      keys[key] = {
        value: masterRedis.get(key),
        ttl: masterRedis.ttl(key),
        type: 'string' // Simplified for demo
      };
    });
    
    res.json({ 
      success: true, 
      data: {
        keys,
        nodeInfo: {
          id: 'master',
          status: 'connected',
          role: 'master',
          connectedSlaves: slaveConnections.size
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get slave states (simulated based on replication)
app.get("/api/replication/slaves", (req, res) => {
  try {
    const slaves = [];
    
    // Only return slaves that are actually connected for replication
    slaveConnections.forEach((connection, slaveId) => {
      const state = slaveStates.get(slaveId);
      slaves.push({
        id: slaveId,
        status: connection.status,
        keys: state ? state.keys : {},
        lastSync: connection.lastSync,
        connectedAt: connection.connectedAt,
        role: 'slave'
      });
    });
    
    res.json({ success: true, data: slaves });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute command on master (for testing)
app.post("/api/replication/master/execute", (req, res) => {
  try {
    const { command, args } = req.body;
    
    let result;
    switch (command.toLowerCase()) {
      case 'set':
        result = masterRedis.set(args[0], args[1], args[2] || null);
        break;
      case 'get':
        result = masterRedis.get(args[0]);
        break;
      case 'delete':
        result = masterRedis.delete(args[0]);
        break;
      case 'flushall':
        result = masterRedis.flushAll();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    res.json({ 
      success: true, 
      data: { 
        result,
        command: command.toUpperCase(),
        args,
        executedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get replication log
app.get("/api/replication/log", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json({ 
      success: true, 
      data: replicationLog.slice(0, limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get replication status
app.get("/api/replication/status", (req, res) => {
  try {
    const status = {
      masterRunning: masterServer !== null,
      connectedSlaves: slaveConnections.size,
      totalReplicationEvents: replicationLog.length,
      masterPort: 7000,
      slavePort: 7001,
      slaves: Array.from(slaveConnections.keys()).map(slaveId => ({
        id: slaveId,
        status: slaveConnections.get(slaveId).status,
        lastSync: slaveConnections.get(slaveId).lastSync
      }))
    };
    
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simulate slave failure
app.post("/api/replication/simulate-failure/:slaveId", (req, res) => {
  try {
    const { slaveId } = req.params;
    const { killProcess = false } = req.query; // Optional: actually kill the process
    const connection = slaveConnections.get(slaveId);
    
    if (connection) {
      // 1. Remove from masterRedis.slaves array (THIS WAS MISSING!)
      const socketIndex = masterRedis.slaves.indexOf(connection.socket);
      if (socketIndex > -1) {
        masterRedis.slaves.splice(socketIndex, 1);
        console.log(`🗑️ Removed slave socket from replication array`);
      }
      
      // 2. Destroy the socket connection
      connection.socket.destroy();
      
      // 3. Remove from tracking maps
      slaveConnections.delete(slaveId);
      const state = slaveStates.get(slaveId);
      if (state) {
        state.status = 'failed';
      }
      
      // 4. Optionally kill the actual process (if managed by us)
      if (killProcess === 'true') {
        const process = slaveProcesses.get(slaveId);
        if (process) {
          console.log(`💀 Killing slave process: ${slaveId}`);
          process.kill();
          slaveProcesses.delete(slaveId);
        }
      }
      
      logReplicationEvent('SLAVE_FAILURE_SIMULATED', [slaveId], 'warning');
      res.json({ 
        success: true, 
        message: `Simulated failure for slave ${slaveId}${killProcess === 'true' ? ' (process killed)' : ' (socket destroyed)'}` 
      });
    } else {
      res.status(404).json({ success: false, error: "Slave not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================
// Dynamic Slave Management
// =========================

const { spawn } = require('child_process');
const slaveProcesses = new Map(); // slaveId -> child process
let nextSlavePort = 7001; // Starting port for slaves

// Helper function to get next available slave port
const getNextSlavePort = () => {
  const port = nextSlavePort;
  nextSlavePort++;
  return port;
};

// Add new slave
app.post("/api/replication/slaves/add", (req, res) => {
  try {
    const { count = 1 } = req.body;
    const startedSlaves = [];
    
    if (!masterServer) {
      return res.status(400).json({ 
        success: false, 
        error: "Master server must be running to add slaves" 
      });
    }

    for (let i = 0; i < count; i++) {
      const slaveId = `slave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const slavePort = getNextSlavePort();
      
      console.log(`📡 Starting new slave: ${slaveId} on port ${slavePort}`);
      
      const slaveProcess = spawn('node', ['slaveServer.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname,
        env: { 
          ...process.env, 
          SLAVE_ID: slaveId,
          SLAVE_PORT: slavePort.toString()
        }
      });

      slaveProcess.stdout.on('data', (data) => {
        console.log(`[${slaveId}] ${data.toString().trim()}`);
      });

      slaveProcess.stderr.on('data', (data) => {
        console.error(`[${slaveId} ERROR] ${data.toString().trim()}`);
      });

      slaveProcess.on('close', (code) => {
        console.log(`❌ Slave ${slaveId} exited with code ${code}`);
        slaveProcesses.delete(slaveId);
        logReplicationEvent('SLAVE_PROCESS_EXITED', [slaveId, code], 'warning');
      });

      slaveProcess.on('error', (err) => {
        console.error(`💥 Failed to start slave ${slaveId}:`, err.message);
        slaveProcesses.delete(slaveId);
        logReplicationEvent('SLAVE_START_FAILED', [slaveId, err.message], 'error');
      });

      slaveProcesses.set(slaveId, {
        process: slaveProcess,
        startedAt: new Date(),
        pid: slaveProcess.pid,
        port: slavePort
      });

      startedSlaves.push({
        id: slaveId,
        pid: slaveProcess.pid,
        port: slavePort,
        startedAt: new Date()
      });

      logReplicationEvent('SLAVE_PROCESS_STARTED', [slaveId], 'success');
    }

    res.json({ 
      success: true, 
      message: `Started ${count} slave(s)`,
      data: startedSlaves
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop specific slave process
app.post("/api/replication/slaves/stop/:slaveId", (req, res) => {
  try {
    const { slaveId } = req.params;
    const slaveProcess = slaveProcesses.get(slaveId);
    
    if (slaveProcess) {
      console.log(`📴 Stopping slave process: ${slaveId}`);
      slaveProcess.process.kill('SIGTERM');
      slaveProcesses.delete(slaveId);
      
      // Also disconnect from master if connected
      const connection = slaveConnections.get(slaveId);
      if (connection) {
        // CRITICAL: Remove from masterRedis.slaves array to stop replication
        const socketIndex = masterRedis.slaves.indexOf(connection.socket);
        if (socketIndex > -1) {
          masterRedis.slaves.splice(socketIndex, 1);
          console.log(`🗑️ Removed slave socket from replication array`);
        }
        
        connection.socket.destroy();
        slaveConnections.delete(slaveId);
        slaveStates.delete(slaveId);
      }
      
      logReplicationEvent('SLAVE_PROCESS_STOPPED', [slaveId], 'warning');
      res.json({ success: true, message: `Stopped slave ${slaveId}` });
    } else {
      res.status(404).json({ success: false, error: "Slave process not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove/disconnect slave
app.delete("/api/replication/slaves/:slaveId", (req, res) => {
  try {
    const { slaveId } = req.params;
    let removed = false;
    
    // Disconnect from master
    const connection = slaveConnections.get(slaveId);
    if (connection) {
      console.log(`🔌 Disconnecting slave: ${slaveId}`);
      
      // CRITICAL: Remove from masterRedis.slaves array to stop replication
      const socketIndex = masterRedis.slaves.indexOf(connection.socket);
      if (socketIndex > -1) {
        masterRedis.slaves.splice(socketIndex, 1);
        console.log(`🗑️ Removed slave socket from replication array`);
      }
      
      connection.socket.destroy();
      slaveConnections.delete(slaveId);
      slaveStates.delete(slaveId);
      removed = true;
    }
    
    // Stop process if exists
    const slaveProcess = slaveProcesses.get(slaveId);
    if (slaveProcess) {
      console.log(`💀 Killing slave process: ${slaveId}`);
      slaveProcess.process.kill('SIGKILL');
      slaveProcesses.delete(slaveId);
      removed = true;
    }
    
    if (removed) {
      logReplicationEvent('SLAVE_REMOVED', [slaveId], 'warning');
      res.json({ success: true, message: `Removed slave ${slaveId}` });
    } else {
      res.status(404).json({ success: false, error: "Slave not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all slave processes
app.get("/api/replication/slaves/processes", (req, res) => {
  try {
    const processes = [];
    slaveProcesses.forEach((proc, slaveId) => {
      const connection = slaveConnections.get(slaveId);
      processes.push({
        id: slaveId,
        pid: proc.pid,
        port: proc.port, // Include port information
        startedAt: proc.startedAt,
        connected: !!connection,
        status: connection ? connection.status : 'process_only'
      });
    });
    
    res.json({ success: true, data: processes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop all slaves
app.post("/api/replication/slaves/stop-all", (req, res) => {
  try {
    const stoppedSlaves = [];
    
    // Stop all processes
    slaveProcesses.forEach((proc, slaveId) => {
      console.log(`📴 Stopping slave process: ${slaveId}`);
      proc.process.kill('SIGTERM');
      stoppedSlaves.push(slaveId);
    });
    
    // Disconnect all connections
    slaveConnections.forEach((conn, slaveId) => {
      conn.socket.destroy();
    });
    
    // Clear all maps and master's slaves array
    slaveProcesses.clear();
    slaveConnections.clear();
    slaveStates.clear();
    
    // CRITICAL: Clear the master's replication array
    masterRedis.slaves = [];
    console.log(`🗑️ Cleared master replication array`);
    
    logReplicationEvent('ALL_SLAVES_STOPPED', [stoppedSlaves.length], 'warning');
    
    res.json({ 
      success: true, 
      message: `Stopped ${stoppedSlaves.length} slave(s)`,
      data: stoppedSlaves
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cleanup zombie slave processes
app.post("/api/replication/cleanup-zombie-slaves", (req, res) => {
  try {
    const { execSync } = require('child_process');
    let killedProcesses = [];
    
    // Find processes running on typical slave ports (7001-7010)
    for (let port = 7001; port <= 7010; port++) {
      try {
        const lsofOutput = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
        if (lsofOutput) {
          const pids = lsofOutput.split('\n');
          pids.forEach(pid => {
            if (pid) {
              try {
                // Check if it's a node process running slaveServer.js
                const psOutput = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
                if (psOutput.includes('slaveServer.js')) {
                  console.log(`🗑️ Killing zombie slave process: PID ${pid} on port ${port}`);
                  execSync(`kill -9 ${pid}`);
                  killedProcesses.push({ pid, port, process: psOutput });
                }
              } catch (psErr) {
                // Process might have already exited, ignore
              }
            }
          });
        }
      } catch (lsofErr) {
        // No process on this port, continue
      }
    }
    
    // Also clear any stale connections from master's slaves array
    masterRedis.slaves = masterRedis.slaves.filter(socket => {
      return !socket.destroyed && socket.readyState === 'open';
    });
    
    console.log(`🧹 Cleaned up ${killedProcesses.length} zombie slave process(es)`);
    logReplicationEvent('ZOMBIE_CLEANUP', [killedProcesses.length], 'success');
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${killedProcesses.length} zombie slave process(es)`,
      data: killedProcesses
    });
  } catch (error) {
    console.error('Error during zombie cleanup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================
// WebSocket for Pub/Sub
// =========================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  serverStats.connectedClients++;
  
  // Handle subscription
  socket.on('subscribe', (channel) => {
    console.log(`Client ${socket.id} subscribing to channel: ${channel}`);
    
    // Check if already subscribed
    const callbackKey = `${socket.id}_${channel}`;
    if (channelCallbacks.has(callbackKey)) {
      console.log(`Client ${socket.id} already subscribed to channel: ${channel}`);
      socket.emit('subscribed', { channel, success: true });
      return;
    }
    
    // Add to channel subscribers
    if (!subscriptions.has(channel)) {
      subscriptions.set(channel, new Set());
    }
    subscriptions.get(channel).add(socket.id);
    
    // Subscribe to the specific node that handles this channel (node1)
    const targetNode = cluster.nodes.node1;
    
    if (targetNode) {
      const callback = (message) => {
        console.log(`Forwarding message to client ${socket.id}: ${message}`);
        socket.emit('message', { channel, message, timestamp: new Date() });
      };
      
      try {
        targetNode.subscribe(channel, callback);
        
        // Store callback and node info
        channelCallbacks.set(callbackKey, callback);
        channelNodes.set(callbackKey, 'node1');
        
        // Join the Socket.IO room for this channel
        socket.join(channel);
        console.log(`Client ${socket.id} subscribed to channel: ${channel} on node1 and joined room`);
        socket.emit('subscribed', { channel, success: true });
        
        // Notify all clients about updated subscriber count
        const subscriberCount = subscriptions.get(channel).size;
        io.emit('channel_subscriber_update', { channel, subscriberCount });
      } catch (error) {
        console.error(`Failed to subscribe to channel ${channel}:`, error);
        socket.emit('subscribed', { channel, success: false, error: error.message });
      }
    } else {
      console.error('Target node not available');
      socket.emit('subscribed', { channel, success: false, error: 'Target node not available' });
    }
  });

  // Handle unsubscription
  socket.on('unsubscribe', (channel) => {
    console.log(`Client ${socket.id} unsubscribing from channel: ${channel}`);
    
    const callbackKey = `${socket.id}_${channel}`;
    const callback = channelCallbacks.get(callbackKey);
    const nodeName = channelNodes.get(callbackKey);
    
    if (callback && nodeName) {
      try {
        const node = cluster.nodes[nodeName];
        if (node) {
          node.unsubscribe(channel, callback);
          console.log(`Client ${socket.id} unsubscribed from channel: ${channel} on ${nodeName}`);
        }
        
        // Remove from tracking
        channelCallbacks.delete(callbackKey);
        channelNodes.delete(callbackKey);
        
        // Remove from channel subscribers
        if (subscriptions.has(channel)) {
          subscriptions.get(channel).delete(socket.id);
          if (subscriptions.get(channel).size === 0) {
            subscriptions.delete(channel);
          }
        }
        
        // Leave the Socket.IO room for this channel
        socket.leave(channel);
        console.log(`Client ${socket.id} left room: ${channel}`);
        
        // Notify all clients about updated subscriber count
        const subscriberCount = subscriptions.get(channel) ? subscriptions.get(channel).size : 0;
        io.emit('channel_subscriber_update', { channel, subscriberCount });
        
        socket.emit('unsubscribed', { channel, success: true });
      } catch (error) {
        console.error(`Failed to unsubscribe from channel ${channel}:`, error);
        socket.emit('unsubscribed', { channel, success: false, error: error.message });
      }
    } else {
      console.log(`Client ${socket.id} was not subscribed to channel: ${channel}`);
      socket.emit('unsubscribed', { channel, success: true });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    serverStats.connectedClients--;
    
    // Clean up all subscriptions for this client
    const keysToRemove = [];
    for (const [key, callback] of channelCallbacks.entries()) {
      if (key.startsWith(socket.id + '_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      const [socketId, channel] = key.split('_', 2);
      const callback = channelCallbacks.get(key);
      const nodeName = channelNodes.get(key);
      
      if (callback && nodeName) {
        try {
          const node = cluster.nodes[nodeName];
          if (node) {
            node.unsubscribe(channel, callback);
            console.log(`Cleaned up subscription for ${socketId} on channel: ${channel} from ${nodeName}`);
          }
        } catch (error) {
          console.error(`Failed to clean up subscription for ${socketId}:`, error);
        }
      }
      
      // Remove from tracking
      channelCallbacks.delete(key);
      channelNodes.delete(key);
      
             // Remove from channel subscribers
       if (subscriptions.has(channel)) {
         subscriptions.get(channel).delete(socketId);
         const subscriberCount = subscriptions.get(channel).size;
         if (subscriberCount === 0) {
           subscriptions.delete(channel);
         }
         
         // Notify all clients about updated subscriber count
         io.emit('channel_subscriber_update', { channel, subscriberCount });
       }
    });
  });
});

// =========================
// Monitoring & Statistics
// =========================

// Get comprehensive server statistics
app.get("/api/monitoring/stats", (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = calculateCpuUsage();
    const uptime = Date.now() - serverStats.startTime;
    
    // Calculate total keys across all nodes
    let totalKeys = 0;
    let ttlKeys = 0;
    const nodeDistribution = {};
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      const nodeKeyCount = keys.length;
      const nodeTtlKeys = keys.filter(key => {
        try {
          const ttl = node.ttl(key);
          return ttl !== -1; // Has TTL
        } catch {
          return false;
        }
      }).length;
      
      nodeDistribution[nodeName] = {
        keyCount: nodeKeyCount,
        ttlKeys: nodeTtlKeys,
        status: 'connected'
      };
      
      totalKeys += nodeKeyCount;
      ttlKeys += nodeTtlKeys;
    }
    
    const stats = {
      // Basic metrics
      totalKeys,
      ttlKeys,
      connectedClients: serverStats.connectedClients,
      commandsExecuted: serverStats.commandsExecuted,
      
      // System metrics
      uptime: Math.floor(uptime / 1000), // seconds
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      cpuUsage: cpuUsage,
      
      // Cluster info
      nodeDistribution,
      totalNodes: Object.keys(cluster.nodes).length,
      activeNodes: Object.keys(cluster.nodes).length, // All nodes are active in our simple setup
      
      // Server info
      serverInfo: {
        version: 'Custom Redis Clone v1.0',
        mode: 'clustered',
        port: 6379,
        apiPort: 3001,
        startTime: serverStats.startTime
      }
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get command statistics over time (simplified)
app.get("/api/monitoring/commands", (req, res) => {
  try {
    // For now, return current command count
    // In a real implementation, you'd track command history
    const now = new Date();
    const commandStats = {
      timestamp: now.toISOString(),
      totalCommands: serverStats.commandsExecuted,
      commandsPerSecond: Math.floor(serverStats.commandsExecuted / ((Date.now() - serverStats.startTime) / 1000))
    };
    
    res.json({ success: true, data: commandStats });
  } catch (error) {
    console.error('Error getting command stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get key distribution across nodes
app.get("/api/monitoring/cluster", (req, res) => {
  try {
    const clusterInfo = {
      nodes: [],
      totalKeys: 0,
      hashRingSize: 3 // Our cluster has 3 nodes
    };
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      const keyCount = keys.length;
      
      clusterInfo.nodes.push({
        name: nodeName,
        keyCount,
        status: 'connected',
        role: 'master', // All nodes are masters in our setup
        keys: keys.slice(0, 10) // Show first 10 keys for debugging
      });
      
      clusterInfo.totalKeys += keyCount;
    }
    
    res.json({ success: true, data: clusterInfo });
  } catch (error) {
    console.error('Error getting cluster info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get TTL distribution
app.get("/api/monitoring/ttl", (req, res) => {
  try {
    const ttlDistribution = {
      noTtl: 0,
      shortTerm: 0,    // < 1 minute
      mediumTerm: 0,   // 1-60 minutes  
      longTerm: 0      // > 60 minutes
    };
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      
      keys.forEach(key => {
        try {
          const ttl = node.ttl(key);
          
          if (ttl === -1) {
            ttlDistribution.noTtl++;
          } else if (ttl < 60) {
            ttlDistribution.shortTerm++;
          } else if (ttl < 3600) {
            ttlDistribution.mediumTerm++;
          } else {
            ttlDistribution.longTerm++;
          }
        } catch (error) {
          ttlDistribution.noTtl++; // Treat errors as no TTL
        }
      });
    }
    
    res.json({ success: true, data: ttlDistribution });
  } catch (error) {
    console.error('Error getting TTL distribution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all TTL keys with details
app.get("/api/monitoring/ttl-keys", (req, res) => {
  try {
    const ttlKeys = [];
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      
      keys.forEach(key => {
        try {
          const ttl = node.ttl(key);
          
          if (ttl > 0) { // Only include keys with active TTL
            const value = node.get(key);
            ttlKeys.push({
              key: key,
              value: typeof value === 'string' ? value : JSON.stringify(value),
              ttl: ttl,
              node: nodeName,
              expires: new Date(Date.now() + ttl * 1000).toISOString()
            });
          }
        } catch (error) {
          // Skip keys that cause errors
          console.warn(`Error getting TTL for key ${key}:`, error.message);
        }
      });
    }
    
    // Sort by remaining TTL (shortest first)
    ttlKeys.sort((a, b) => a.ttl - b.ttl);
    
    res.json({ success: true, data: ttlKeys });
  } catch (error) {
    console.error('Error getting TTL keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================
// RDB Persistence Operations
// =========================

// Get persistence status
app.get("/api/persistence/status", (req, res) => {
  try {
    const persistenceStatus = {
      autoSaveEnabled: true,
      autoSaveInterval: 30000, // 30 seconds
      lastSaveTime: null,
      rdbFiles: [],
      totalKeys: 0
    };

    let totalKeys = 0;
    // Get RDB file info for each node
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      totalKeys += keys.length;
      
      // Check if RDB file exists
      const fs = require('fs');
      const path = require('path');
      const rdbPath = path.join(__dirname, `data_${nodeName}.json`);
      
      if (fs.existsSync(rdbPath)) {
        const stats = fs.statSync(rdbPath);
        persistenceStatus.rdbFiles.push({
          node: nodeName,
          filePath: rdbPath,
          size: stats.size,
          lastModified: stats.mtime,
          keyCount: keys.length
        });
        
        // Use the most recent file modification time as last save time
        if (!persistenceStatus.lastSaveTime || stats.mtime > persistenceStatus.lastSaveTime) {
          persistenceStatus.lastSaveTime = stats.mtime;
        }
      }
    }
    
    persistenceStatus.totalKeys = totalKeys;
    res.json({ success: true, data: persistenceStatus });
  } catch (error) {
    console.error('Error getting persistence status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual save (trigger RDB save)
app.post("/api/persistence/save", (req, res) => {
  try {
    const saveResults = [];
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      try {
        node.saveToFile();
        saveResults.push({
          node: nodeName,
          success: true,
          keyCount: node.keys().length,
          timestamp: new Date()
        });
      } catch (error) {
        saveResults.push({
          node: nodeName,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    
    const allSuccessful = saveResults.every(result => result.success);
    
    res.json({ 
      success: allSuccessful, 
      data: {
        message: allSuccessful ? 'RDB save completed successfully' : 'RDB save completed with errors',
        results: saveResults
      }
    });
  } catch (error) {
    console.error('Error performing manual save:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Load from RDB file
app.post("/api/persistence/load", (req, res) => {
  try {
    const loadResults = [];
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      try {
        node.loadFromFile();
        loadResults.push({
          node: nodeName,
          success: true,
          keyCount: node.keys().length,
          timestamp: new Date()
        });
      } catch (error) {
        loadResults.push({
          node: nodeName,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    
    const allSuccessful = loadResults.every(result => result.success);
    
    res.json({ 
      success: allSuccessful, 
      data: {
        message: allSuccessful ? 'RDB load completed successfully' : 'RDB load completed with errors',
        results: loadResults
      }
    });
  } catch (error) {
    console.error('Error performing manual load:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get RDB file content info
app.get("/api/persistence/info", (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const rdbInfo = [];
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const rdbPath = path.join(__dirname, `data_${nodeName}.json`);
      
      if (fs.existsSync(rdbPath)) {
        const stats = fs.statSync(rdbPath);
        const content = fs.readFileSync(rdbPath, 'utf8');
        let keyCount = 0;
        let corruptedFile = false;
        
        try {
          const data = JSON.parse(content);
          keyCount = data.store ? data.store.length : 0;
        } catch (error) {
          corruptedFile = true;
        }
        
        rdbInfo.push({
          node: nodeName,
          filePath: rdbPath,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          lastModified: stats.mtime,
          keyCount,
          corrupted: corruptedFile,
          exists: true
        });
      } else {
        rdbInfo.push({
          node: nodeName,
          filePath: rdbPath,
          exists: false
        });
      }
    }
    
    res.json({ success: true, data: rdbInfo });
  } catch (error) {
    console.error('Error getting RDB info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// =========================
// Process Monitoring Operations
// =========================

// Get process information and worker/child process status
app.get("/api/processes/status", (req, res) => {
  try {
    const processInfo = {
      mainProcess: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      workers: {
        ttlWorkers: [],
        rdbWorkers: []
      },
      clustering: {
        totalNodes: Object.keys(cluster.nodes).length,
        activeNodes: Object.keys(cluster.nodes).length,
        nodeStatus: {}
      }
    };

    // Get node information including their worker processes
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      const ttlKeys = keys.filter(key => {
        try {
          const ttl = node.ttl(key);
          return ttl > 0;
        } catch {
          return false;
        }
      });

      processInfo.clustering.nodeStatus[nodeName] = {
        keyCount: keys.length,
        ttlKeys: ttlKeys.length,
        status: 'active',
        memoryUsage: 'N/A', // In a real implementation, this would come from worker
        lastActivity: new Date()
      };

      // Simulate TTL worker info (since we can't directly access worker stats)
      processInfo.workers.ttlWorkers.push({
        nodeId: nodeName,
        status: 'active',
        activeTasks: ttlKeys.length,
        processedTasks: Math.floor(Math.random() * 1000) + 500, // Simulated
        lastActivity: new Date(),
        memoryUsage: Math.floor(Math.random() * 50) + 10 // MB, simulated
      });

      // Simulate RDB worker info
      processInfo.workers.rdbWorkers.push({
        nodeId: nodeName,
        status: 'idle',
        lastSave: new Date(Date.now() - Math.random() * 30000), // Within last 30 seconds
        processedSaves: Math.floor(Math.random() * 50) + 10, // Simulated
        avgSaveTime: Math.floor(Math.random() * 200) + 50, // ms, simulated
        memoryUsage: Math.floor(Math.random() * 30) + 5 // MB, simulated
      });
    }

    res.json({ success: true, data: processInfo });
  } catch (error) {
    console.error('Error getting process status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get real-time process metrics
app.get("/api/processes/metrics", (req, res) => {
  try {
    const metrics = {
      timestamp: new Date(),
      mainProcess: {
        cpuUsage: calculateCpuUsage(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 0,
        activeRequests: process._getActiveRequests ? process._getActiveRequests().length : 0
      },
      workerStats: {
        ttlWorkers: {
          totalActive: Object.keys(cluster.nodes).length,
          averageTaskLoad: Math.floor(Math.random() * 10) + 1,
          totalProcessedTasks: Math.floor(Math.random() * 10000) + 5000
        },
        rdbWorkers: {
          totalActive: Object.keys(cluster.nodes).length,
          recentSaves: Math.floor(Math.random() * 5) + 1,
          averageSaveTime: Math.floor(Math.random() * 200) + 50
        }
      },
      systemMetrics: {
        totalKeys: 0,
        totalMemoryUsed: 0,
        operationsPerSecond: Math.floor(Math.random() * 1000) + 100
      }
    };

    // Calculate real metrics from nodes
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      metrics.systemMetrics.totalKeys += keys.length;
    }

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error getting process metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================
// Legacy API Support (for backward compatibility)
// =========================

// Legacy GET endpoint
app.get("/get", (req, res) => {
  const { key } = req.query;
  try {
    const value = cluster.get(key);
    res.json({ success: true, data: { key, value } });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy SET endpoint
app.post("/set", (req, res) => {
  const { key, value, ttl } = req.body;
  try {
    const result = cluster.set(key, value, ttl);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy DELETE endpoint
app.delete("/delete", (req, res) => {
  const { key } = req.query;
  try {
    const result = cluster.delete(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy KEYS endpoint
app.get("/keys", (req, res) => {
  try {
    const allKeys = new Set();
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const nodeKeys = node.keys();
      nodeKeys.forEach(key => allKeys.add(key));
    }
    res.json({ success: true, data: Array.from(allKeys) });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy INCREMENT endpoint
app.post("/incr", (req, res) => {
  const { key } = req.body;
  try {
    const result = cluster.route(key).incr(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy DECREMENT endpoint
app.post("/decr", (req, res) => {
  const { key } = req.body;
  try {
    const result = cluster.route(key).decr(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy TTL endpoint
app.get("/ttl", (req, res) => {
  const { key } = req.query;
  try {
    const result = cluster.route(key).ttl(key);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy INFO endpoint
app.get("/info", (req, res) => {
  try {
    const info = cluster.route("any").info();
    res.json({ success: true, data: info });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// Legacy STATS endpoint
app.get("/stats", (req, res) => {
  try {
    const stats = {
      nodeDistribution: {},
      totalKeys: 0
    };
    
    for (const [nodeName, node] of Object.entries(cluster.nodes)) {
      const keys = node.keys();
      stats.nodeDistribution[nodeName] = {
        keyCount: keys.length,
        keys: keys
      };
      stats.totalKeys += keys.length;
    }
    
    res.json({ success: true, data: stats });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

// Check if sample data should be initialized
const shouldInitializeSampleData = process.env.INIT_SAMPLE_DATA === 'true' || 
                                   process.argv.includes('--sample-data') ||
                                   process.argv.includes('--demo');

async function startServer() {
  try {
    // Optionally populate with sample data
    if (shouldInitializeSampleData) {
      console.log('🚀 Initializing with sample data for demo...\n');
      
      const populator = new SampleDataPopulator();
      
      // Replace cluster nodes with populated ones
      console.log('📊 Populating Redis instances with comprehensive demo data...');
      const sampleData = populator.generator.generateAll();
      
      // Populate each node in the cluster
      Object.entries(cluster.nodes).forEach(([nodeName, node]) => {
        let nodeKeyCount = 0;
        let nodeTTLCount = 0;
        
        // Distribute sample data across nodes using consistent hashing
        for (const [key, value] of sampleData.keys) {
          const { createHash } = require('crypto');
          const hash = createHash('sha256').update(key).digest('hex');
          const nodeIndex = parseInt(hash.substr(0, 8), 16) % 3;
          const targetNodeName = ['node1', 'node2', 'node3'][nodeIndex];
          
          if (targetNodeName === nodeName) {
            let ttl = null;
            
            if (sampleData.ttl.has(key)) {
              const expiryTime = sampleData.ttl.get(key);
              const calculatedTTL = Math.floor((expiryTime - Date.now()) / 1000);
              
              // Ensure TTL is positive and reasonable
              if (calculatedTTL > 0) {
                ttl = calculatedTTL;
              } else {
                // For expired/short TTL keys, assign new reasonable TTL based on key type
                if (key.includes(':online') || key.includes(':current')) {
                  ttl = 300; // 5 minutes for real-time data
                } else if (key.includes(':session') || key.includes(':cache')) {
                  ttl = 1800; // 30 minutes for session data
                } else if (key.includes('report:') || key.includes('metrics:')) {
                  ttl = 36000; // 10 hours for reports
                } else if (key.includes(':history') || key.includes('leaderboard:')) {
                  ttl = 3600; // 1 hour for historical data
                } else {
                  ttl = 600; // 10 minutes default
                }
              }
            }
            
            try {
              node.set(key, value, ttl);
              nodeKeyCount++;
              if (ttl && ttl > 0) nodeTTLCount++;
            } catch (error) {
              console.error(`❌ Error setting key ${key}:`, error.message);
            }
          }
        }
        
        // Note: Pub/sub channels are created dynamically when needed
        // The Redis subscribe/publish methods handle channel creation automatically
        
        console.log(`✅ ${nodeName}: ${nodeKeyCount} keys (${nodeTTLCount} with TTL)`);
      });
      
      console.log(`\n🎉 Sample data initialization complete!`);
      console.log(`📊 Total keys distributed: ${sampleData.keys.size}`);
      console.log(`⏰ Keys with TTL: ${sampleData.ttl.size}`);
      console.log(`📡 Pub/sub channels: Available dynamically`);
      console.log(`🎯 Demo environment ready for monitoring showcase!\n`);
      
      // Start TTL scheduler for long-term keys
      console.log('⏰ Starting long-term TTL key scheduler...');
      const refreshLongTermKeys = () => {
        console.log('🔄 Refreshing long-term TTL keys...');
        
        try {
          const generator = new (require('./sampleDataGenerator'))();
          generator.generateLongTermTTLData();
          
          const ttlData = generator.ttlData;
          const keyData = generator.data;
          
          let refreshedCount = 0;
          
          // Distribute the new TTL keys across cluster nodes
          for (const [key, value] of keyData.entries()) {
            if (ttlData.has(key)) {
              const { createHash } = require('crypto');
              const hash = createHash('sha256').update(key).digest('hex');
              const nodeIndex = parseInt(hash.substr(0, 8), 16) % 3;
              const targetNodeName = ['node1', 'node2', 'node3'][nodeIndex];
              const targetNode = cluster.nodes[targetNodeName];
              
              if (targetNode) {
                const expiryTime = ttlData.get(key);
                let ttlSeconds = Math.floor((expiryTime - Date.now()) / 1000);
                
                // Ensure TTL is positive (should be 36000 for 10-hour keys)
                if (ttlSeconds <= 0) {
                  ttlSeconds = 36000; // Reset to 10 hours if calculation failed
                }
                
                targetNode.set(key, value, ttlSeconds);
                refreshedCount++;
              }
            }
          }
          
          console.log(`✅ Refreshed ${refreshedCount} long-term TTL keys`);
          console.log(`⏰ Next refresh in 10 hours`);
          
        } catch (error) {
          console.error('❌ Error refreshing TTL keys:', error);
        }
      };
      
      // Initial refresh and schedule every 10 hours
      refreshLongTermKeys();
      setInterval(refreshLongTermKeys, 36000000); // 10 hours in milliseconds
      
      console.log('✅ TTL key scheduler started (refreshes every 10 hours)');
    }
    
    server.listen(PORT, () => {
      console.log(`API server running at http://localhost:${PORT}`);
      console.log(`WebSocket server running for Pub/Sub functionality`);
      
      if (shouldInitializeSampleData) {
        console.log(`\n🎯 DEMO MODE ACTIVE`);
        console.log(`📈 Rich sample data loaded for monitoring demonstration`);
        console.log(`⏰ Long-term TTL keys refresh automatically every 10 hours`);
        console.log(`🔧 Start the UI with: cd redis-ui && npm start`);
        console.log(`💡 Visit the Monitoring tab to see comprehensive stats!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

startServer();
