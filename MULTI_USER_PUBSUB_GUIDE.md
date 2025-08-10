# Multi-User Pub/Sub Testing Guide

## Overview
This guide shows you how to test your Redis clone's Pub/Sub functionality with multiple simulated users who can all subscribe to channels and see messages from each other.

## Quick Start

### 1. Make sure your servers are running:
```bash
# Terminal 1 - Start Redis API server
node apiServer.js

# Terminal 2 - Start React UI (optional)
cd redis-ui && npm start
```

### 2. Run the multi-user test:
```bash
# Interactive mode (recommended)
node multi_user_pubsub_test.js

# Or run a specific scenario
node multi_user_pubsub_test.js scenario chat-room
```

## Features

### 👥 Named Users
- **Alice, Bob, Charlie, Diana, Eve** - 5 simulated users
- Each user has their own WebSocket connection
- Users can subscribe to different channels
- Messages show which user sent them

### 📡 Channel Management
- Users can join/leave channels independently
- Multiple users can subscribe to the same channel
- Messages broadcast to all subscribers
- Support for multiple channels simultaneously

### 🎭 Predefined Scenarios
1. **chat-room** - Casual conversation simulation
2. **team-meeting** - Professional standup meeting
3. **gaming** - Gaming lobby chat
4. **multi-channel** - Tests different channel combinations

## Interactive Commands

### Basic Usage
```
<message>                    - Send message as current user
/user <name>                 - Switch active user (alice, bob, charlie, diana, eve)
/join <channel>              - Join a channel (current user)
/join-all <channel>          - All users join channel
/leave <channel>             - Leave a channel (current user)
```

### Information
```
/users                       - List all users and their channels
/status                      - Show detailed user statistics
/help                        - Show command help
```

### Scenarios
```
/scenario <name>             - Run predefined scenario
/scenario                    - List available scenarios
```

### System
```
/quit                        - Exit the test
```

## Example Usage

### 1. Basic Chat Testing
```bash
node multi_user_pubsub_test.js
```

Then in the interactive prompt:
```
[Alice] channels(none)> /join general
[Alice] channels(general)> /user bob
[Bob] channels(none)> /join general
[Bob] channels(general)> Hello everyone!
[Bob] channels(general)> /user alice
[Alice] channels(general)> Hi Bob! How are you?
```

### 2. Multi-Channel Testing
```
[Alice] channels(none)> /join general
[Alice] channels(general)> /join announcements
[Alice] channels(general, announcements)> /user bob
[Bob] channels(none)> /join general
[Bob] channels(general)> Testing general channel
[Bob] channels(general)> /user alice
[Alice] channels(general, announcements)> Got your message Bob!
```

### 3. Run Automated Scenarios
```bash
# Chat room simulation
node multi_user_pubsub_test.js scenario chat-room

# Team meeting simulation  
node multi_user_pubsub_test.js scenario team-meeting

# Gaming lobby simulation
node multi_user_pubsub_test.js scenario gaming

# Multi-channel testing
node multi_user_pubsub_test.js scenario multi-channel
```

## What You'll See

### Message Format
```
📨 [10:30:25] Bob received on #general: "Alice: Hello everyone!"
📤 Alice sent message to #general (3 subscribers)
```

### User Status
```
👥 Active Users:
  🟢 Alice (current) - channels: general, announcements
  🟢 Bob - channels: general
  🟢 Charlie - channels: tech-talk
  🟢 Diana - channels: general
  🟢 Eve - channels: announcements
```

### Detailed Statistics
```
📊 DETAILED STATUS:

  Alice:
    Status: 🟢 Connected
    Channels: general, announcements
    Messages sent: 5
    Messages received: 8

  Bob:
    Status: 🟢 Connected
    Channels: general
    Messages sent: 3
    Messages received: 4
```

## Testing Scenarios

### 1. Real-time Message Delivery
- Subscribe multiple users to same channel
- Send messages from different users
- Verify all subscribers receive messages instantly

### 2. Channel Isolation
- Subscribe users to different channels
- Send messages to specific channels
- Verify users only receive messages from their subscribed channels

### 3. Multi-Channel Subscriptions
- Subscribe users to multiple channels
- Test messages across different channels
- Verify proper channel routing

### 4. User Management
- Add/remove users dynamically
- Test connection handling
- Verify message delivery to active users only

## Integration with Other Tools

### With Web UI
1. Open Redis UI in browser: http://localhost:3000
2. Go to "Pub/Sub Viewer" tab
3. Subscribe to same channels as your test users
4. See messages from test users in real-time

### With CLI Console
1. Open CLI Console in web UI
2. Use `SUBSCRIBE channel` and `PUBLISH channel message`
3. Test interaction between CLI and test users

### With curl/HTTP API
```bash
# Publish message via HTTP API while test users are subscribed
curl -X POST http://localhost:3001/api/pubsub/publish \
  -H "Content-Type: application/json" \
  -d '{"channel": "general", "message": "Message from HTTP API"}'
```

## Troubleshooting

### Connection Issues
- Ensure `apiServer.js` is running on port 3001
- Check WebSocket connections in console output
- Verify no firewall blocking connections

### Message Not Received
- Check if users are subscribed to the same channel
- Use `/status` to verify user states
- Ensure server is processing WebSocket events

### Performance Testing
- Increase user count in `createUsers()` method
- Test with rapid message sending
- Monitor server logs for any issues

## Advanced Usage

### Custom User Count
Edit `multi_user_pubsub_test.js` and modify the `userNames` array in `createUsers()`:
```javascript
const userNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'];
```

### Custom Scenarios
Add new scenarios by implementing new methods like:
```javascript
async customScenario() {
    // Your custom test logic
}
```

This multi-user testing setup gives you a comprehensive way to test all aspects of your Redis clone's Pub/Sub functionality with realistic user interactions! 