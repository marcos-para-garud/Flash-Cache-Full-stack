# 🚀 Pub/Sub Testing Guide - Single User Methods

## Overview
Your Redis clone has **multiple Pub/Sub interfaces**. Here are practical ways to test the functionality locally with a single user:

---

## 🌐 **Method 1: Multiple Browser Tabs** (EASIEST)

### **Setup:**
1. Open **3-4 browser tabs** with `http://localhost:3000`
2. Go to **Pub/Sub Viewer** in each tab

### **Test Scenario:**
```
Tab 1: Subscribe to "chat" → Send "Hello from Tab 1!"
Tab 2: Subscribe to "chat" → Send "Hello from Tab 2!"  
Tab 3: Subscribe to "chat" → Send "Hello from Tab 3!"
Tab 4: Subscribe to "notifications" → Send alerts
```

### **Expected Result:**
- ✅ Messages appear **instantly** in all subscribed tabs
- ✅ **Real-time WebSocket delivery**
- ✅ **Visual confirmation** of pub/sub working

---

## 💻 **Method 2: CLI Console + UI Combo**

### **Setup:**
1. **UI**: Go to Pub/Sub Viewer → Subscribe to "chat"
2. **CLI Console**: Use CLI in same UI

### **Test Commands:**
```bash
# In CLI Console (bottom of UI):
PUBLISH chat "Hello from CLI!"
PUBLISH chat "Testing CLI to WebSocket delivery"
PUBLISH notifications "System alert from CLI"
```

### **Expected Result:**
- ✅ CLI messages appear in Pub/Sub Viewer
- ✅ **Cross-interface communication** (HTTP → WebSocket)

---

## 🔧 **Method 3: Terminal curl + UI**

### **Setup:**
1. **UI**: Subscribe to channels in Pub/Sub Viewer
2. **Terminal**: Run the test script

### **Commands:**
```bash
# Make script executable (already done)
chmod +x pubsub_test_script.sh

# Run automated tests
./pubsub_test_script.sh
```

### **Or Manual curl:**
```bash
# Publish to chat channel
curl -X POST http://localhost:3001/api/pubsub/publish \
  -H "Content-Type: application/json" \
  -d '{"channel":"chat", "message":"Hello from curl!"}'

# Get all channels
curl http://localhost:3001/api/pubsub/channels | jq '.'
```

### **Expected Result:**
- ✅ **External HTTP publishers** send to WebSocket subscribers
- ✅ **API testing** with immediate UI feedback

---

## 🤖 **Method 4: Automated WebSocket Simulator**

### **Setup:**
Install socket.io-client if needed:
```bash
npm install socket.io-client
```

### **Demo Mode (Automated):**
```bash
# Run automated demo
node pubsub_simulator.js

# Output shows:
# - 3 WebSocket clients connecting
# - Subscribing to channels  
# - Publishing messages
# - Real-time message delivery
```

### **Interactive Mode:**
```bash
# Run interactive mode
node pubsub_simulator.js interactive

# Available commands:
> publish chat Hello everyone!
> subscribe notifications  
> status
> quit
```

### **Expected Result:**
- ✅ **Multiple simulated clients**
- ✅ **Real WebSocket connections**
- ✅ **Programmatic testing**

---

## ⚡ **Method 5: Traditional Redis TCP (Port 6379)**

### **Setup:**
Your Redis also runs a traditional TCP server on port 6379

### **Using telnet/nc:**
```bash
# Connect to Redis TCP server
telnet localhost 6379

# Commands:
SUBSCRIBE chat
# (In another terminal session)
PUBLISH chat "Hello via TCP!"
```

### **Using redis-cli (if installed):**
```bash
# Terminal 1 - Subscribe
redis-cli -p 6379
SUBSCRIBE chat

# Terminal 2 - Publish  
redis-cli -p 6379
PUBLISH chat "Hello from redis-cli!"
```

---

## 🎯 **RECOMMENDED TESTING WORKFLOW**

### **Quick Test (2 minutes):**
1. **Open 2 browser tabs** → Pub/Sub Viewer
2. **Subscribe both** to "chat"
3. **Send message** from one tab
4. **See real-time delivery** in other tab

### **Comprehensive Test (5 minutes):**
1. **Method 1**: Test browser tabs
2. **Method 3**: Run curl script  
3. **Method 4**: Run Node.js simulator
4. **Check**: All methods deliver to UI subscribers

### **Advanced Testing:**
1. **Load testing**: Run simulator with 10+ clients
2. **Cross-channel**: Test multiple channels simultaneously  
3. **Error handling**: Test disconnection/reconnection
4. **Performance**: Monitor message delivery speed

---

## 📊 **What to Observe**

### **✅ Success Indicators:**
- Messages appear **instantly** across all interfaces
- **WebSocket status** shows "Connected" 
- **Message counters** increment correctly
- **Timestamps** show real-time delivery
- **Multiple channels** work independently
- **Subscriber counts** update accurately

### **❌ Failure Indicators:**
- Messages don't appear in other clients
- WebSocket shows "Disconnected"
- Error messages in console/logs
- Delayed or missing message delivery

---

## 🛠️ **Troubleshooting**

### **WebSocket Issues:**
```bash
# Check WebSocket connection
curl http://localhost:3001/socket.io/socket.io.js
```

### **API Issues:**
```bash
# Test API endpoints
curl http://localhost:3001/api/pubsub/channels
```

### **Server Logs:**
Check your `apiServer.js` console for:
- Client connection/disconnection logs
- Subscription confirmations  
- Message forwarding logs

---

## 🎉 **Real-World Scenarios**

### **Chat Application:**
- Multiple users in "general" channel
- Private channels for teams
- System notifications channel

### **Live Updates:**
- Stock price updates
- System monitoring alerts
- Real-time dashboard updates

### **Gaming:**
- Player movement broadcasts
- Game state synchronization
- Lobby chat systems

---

## 🔧 **Files Created:**
- `pubsub_test_script.sh` - curl-based testing
- `pubsub_simulator.js` - WebSocket client simulator  
- This guide for comprehensive testing

Your Pub/Sub implementation supports **all Redis pub/sub patterns** with real-time WebSocket delivery! 🚀 