# Multi-User Pub/Sub Testing in UI

## Overview
Your Redis clone now has built-in multi-user simulation directly in the web UI! No more terminal commands - everything is visual and interactive.

## How to Use

### 1. Open the Web UI
Make sure both servers are running:
```bash
# Terminal 1 - API Server
node apiServer.js

# Terminal 2 - React UI
cd redis-ui && npm start
```

Open http://localhost:3000 and go to **"Pub/Sub Viewer"** tab.

### 2. Enable Test Users
1. Click the **"Start Test Users"** button in the top-right
2. You'll see "5/5 connected" when all test users are ready
3. Alice, Bob, Charlie, Diana, and Eve are now active!

### 3. Set Up a Channel
1. Add a channel (e.g., "general") in the left sidebar
2. Select the channel 
3. Subscribe to it (click "Subscribe" button)

### 4. Join Test Users to Channel
In the blue **"Test Users"** panel:
- Click **"Join All"** to subscribe all 5 test users to the selected channel
- You should see the subscriber count increase to 6 (you + 5 test users)

### 5. Send Messages as Different Users
- **Select a user** from the dropdown (Alice, Bob, Charlie, Diana, Eve)
- **Type a message** in the input box
- **Click "Send as [Username]"** or press Enter
- The message appears with the user's colored avatar and name!

### 6. Run Automated Scenarios
Click one of the scenario buttons:
- **"chat room"** - Casual conversation between users
- **"team meeting"** - Professional standup discussion  
- **"gaming"** - Gaming lobby chat

Watch as the test users automatically have realistic conversations!

## What You'll See

### Visual Indicators
- **Colored avatars** for each test user (Alice=blue, Bob=green, etc.)
- **"Test User" badges** on messages from simulated users
- **Real-time message delivery** to all subscribers
- **User status** in the dropdown (🟢 connected, 🔴 disconnected)

### Example Conversation
After running "chat room" scenario:
```
👤 Alice: Hey everyone! How's it going? 👋
👤 Bob: Hey Alice! Good here, working on some Redis testing  
👤 Charlie: Oh nice! I love the pub/sub features
👤 Diana: Same here! The real-time messaging is so smooth
```

### Mixed Conversations
- Send your own messages alongside test users
- Switch between users mid-conversation
- Test users and real users all see each other's messages

## Features

### ✅ What Works
- **5 simulated users** with unique connections
- **Real-time messaging** between all users
- **Visual avatars and names** for easy identification
- **3 predefined scenarios** for realistic conversations
- **Manual user switching** to send custom messages
- **Channel management** - test users can join/leave channels
- **Mixed conversations** - combine real and simulated users

### 🎯 Perfect For Testing
- **Message broadcasting** - verify all subscribers receive messages
- **Real-time delivery** - messages appear instantly
- **Channel isolation** - test multiple channels with different user groups
- **UI responsiveness** - see how the interface handles busy chat
- **WebSocket reliability** - test connection handling

## Tips

### Best Testing Workflow
1. **Start test users** → **Create channel** → **Join all users** → **Run scenario**
2. **Switch users manually** to send custom messages between scenarios
3. **Test multiple channels** by creating new ones and moving users around
4. **Mix real and simulated** messages for comprehensive testing

### Advanced Testing
- Open **multiple browser tabs** to act as additional real users
- Use **CLI Console** alongside test users for cross-interface testing
- **Monitor server logs** while scenarios run to verify backend behavior

This integrated approach makes testing your Redis clone's Pub/Sub features much more intuitive and visual! 