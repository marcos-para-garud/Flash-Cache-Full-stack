# 🚀 Redis Clone Demo Setup Guide

This guide shows you how to start the Redis clone with comprehensive sample data that showcases all monitoring and management features.

## 🎯 Quick Start - Demo Mode

For the fastest demo experience with rich sample data:

```bash
# Option 1: Using npm script (recommended)
npm run demo

# Option 2: Using the demo launcher
npm run demo-launcher

# Option 3: Direct command
node apiServer.js --demo
```

Then start the UI in a new terminal:
```bash
cd redis-ui
npm start
```

## 📊 What's Included in Demo Mode

When you start in demo mode, the Redis instances are automatically populated with:

### 👥 User Management Data
- **5 sample users** with profiles, sessions, and preferences
- **Session tokens** with short TTL (1 hour)
- **User caches** with medium TTL (30 minutes) 
- **Online status** indicators with very short TTL (5 minutes)

### 🛒 E-commerce Data
- **Product catalog** with 5 sample products
- **Shopping carts** for 15 simulated sessions
- **Product view counters** and cart statistics
- **Sales metrics** and inventory alerts

### 💬 Social Media Data
- **25 sample posts** with engagement metrics
- **Trending hashtags** with popularity scores
- **User feed caches** with short expiration
- **Real-time engagement tracking**

### 🎮 Gaming Data
- **20 player profiles** with levels, experience, and achievements
- **Active game sessions** with short TTL
- **Leaderboard data** cached for performance
- **8 game rooms** with player counts and status

### 💰 Financial Data
- **Currency exchange rates** with real-time updates
- **50 trading records** with timestamps
- **User portfolios** with value tracking
- **Market data** with automatic refresh

### 🌡️ IoT Sensor Data
- **6 sensor types**: temperature, humidity, motion, air quality
- **Real-time readings** with 30-second TTL
- **Historical data** cached for 1 hour
- **Sensor metadata** and location tracking

### 🗄️ Application Cache Data
- **Page caches** for common website pages
- **API response caches** with 5-minute TTL
- **Database query caches** with 10-minute TTL
- **Performance optimization data**

### ⚙️ Configuration Data
- **Application settings** (permanent)
- **Feature flags** with 2-hour TTL
- **Rate limiting** counters with 1-minute TTL
- **System configuration** parameters

### 📡 Pub/Sub Channels
- **8 active channels**: notifications, chat, alerts, analytics, etc.
- **Sample messages** demonstrating real-time communication
- **Subscriber counts** and activity tracking

## 🔄 Live Data Updates

In demo mode, certain metrics update automatically:
- **CPU usage** (every 10 seconds)
- **Memory usage** (every 10 seconds) 
- **Active connections** (every 10 seconds)
- **Requests per second** (every 10 seconds)

## 📈 Monitoring Features Showcased

The sample data is designed to showcase these monitoring capabilities:

### 🖥️ Main Dashboard
- Total keys across all nodes
- Keys with TTL expiration
- Memory usage statistics
- Node distribution graphs

### 🔍 Key Explorer
- Browse all sample keys by category
- View different data types (strings, JSON, lists, hashes)
- See TTL countdown timers
- Explore key distribution across nodes

### ⏰ TTL Playground
- Monitor keys approaching expiration
- See TTL countdown in real-time
- Track expiration statistics
- Test TTL modifications

### 🏗️ Cluster View
- Visualize data distribution across 3 nodes
- See load balancing in action
- Monitor node health status
- Track consistent hashing results

### 📊 Monitoring Dashboard
- Real-time performance metrics
- Memory usage graphs
- TTL distribution charts
- Node-by-node statistics

### 💬 Pub/Sub Viewer
- Active channels with subscriber counts
- Real-time message flow
- Channel activity monitoring
- Multi-user communication demo

## 🛠️ Alternative Startup Methods

### Regular API Server (No Sample Data)
```bash
npm run api
# or
node apiServer.js
```

### Standalone Sample Data Population
```bash
npm run populate-data
# or  
node populateSampleData.js
```

### Environment Variable Control
```bash
INIT_SAMPLE_DATA=true node apiServer.js
```

## 🎮 Demo Scenarios

### Scenario 1: E-commerce Monitoring
1. Start in demo mode
2. Go to Key Explorer
3. Search for `product:` keys to see product data
4. Search for `cart:` keys to see shopping carts
5. Check Monitoring tab for cache hit rates

### Scenario 2: Real-time IoT Dashboard  
1. Start in demo mode
2. Go to Key Explorer  
3. Search for `sensor:` keys
4. Watch TTL countdown on current readings
5. Monitor data freshness in real-time

### Scenario 3: Social Media Analytics
1. Start in demo mode
2. Search for `post:` and `trending:` keys
3. Observe engagement metrics
4. Check user feed caches and their TTL

### Scenario 4: Gaming Leaderboards
1. Start in demo mode
2. Browse `player:` and `leaderboard:` keys
3. See active game sessions
4. Monitor player statistics and rankings

### Scenario 5: Multi-user Pub/Sub
1. Start in demo mode
2. Open Pub/Sub tab
3. Subscribe to different channels
4. Open multiple browser tabs for multi-user simulation
5. Send messages between users

## 🔧 Customization

You can modify the sample data by editing:
- `sampleDataGenerator.js` - Core data generation logic
- `populateSampleData.js` - Data population and distribution
- Adjust TTL values, data quantities, or add new categories

## 🐛 Troubleshooting

### Issue: No sample data visible
**Solution**: Ensure you used `--demo` flag or `npm run demo`

### Issue: Some features show empty
**Solution**: Sample data generation takes a moment. Refresh the UI after 5 seconds.

### Issue: TTL keys expiring too quickly
**Solution**: TTL values are intentionally short for demo purposes. Restart demo mode to repopulate.

### Issue: UI showing old data
**Solution**: Clear browser cache or use browser's hard refresh (Ctrl+Shift+R)

## 🏁 Next Steps

After exploring the demo:
1. Try the Key Explorer to browse all generated data
2. Monitor real-time TTL countdowns
3. Test the pub/sub messaging features
4. Examine the cluster data distribution
5. Watch live metrics updates in the Monitoring tab

The demo environment provides a comprehensive showcase of Redis functionality with realistic data patterns that you might see in production applications. 