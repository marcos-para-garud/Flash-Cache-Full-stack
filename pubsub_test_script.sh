#!/bin/bash

echo "🧪 REDIS PUB/SUB TESTING SCRIPT"
echo "================================"

BASE_URL="http://localhost:3001"

echo ""
echo "📋 Instructions:"
echo "1. Open UI at http://localhost:3000"
echo "2. Go to Pub/Sub Viewer" 
echo "3. Subscribe to 'chat' channel"
echo "4. Run this script to send messages"
echo ""

# Function to publish a message
publish_message() {
    local channel=$1
    local message=$2
    echo "📤 Publishing to '$channel': $message"
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"channel\":\"$channel\", \"message\":\"$message\"}" \
        $BASE_URL/api/pubsub/publish | jq '.'
    
    echo ""
}

# Function to get channels
get_channels() {
    echo "📡 Getting all channels:"
    curl -s $BASE_URL/api/pubsub/channels | jq '.'
    echo ""
}

echo "🚀 Starting Pub/Sub tests..."
sleep 2

# Test 1: Get channels
get_channels

# Test 2: Send test messages
publish_message "chat" "Hello from curl script! 👋"
sleep 1

publish_message "chat" "This is message #2 from terminal"
sleep 1

publish_message "chat" "Testing real-time delivery 🚀"
sleep 1

publish_message "notifications" "System alert: Testing complete!"
sleep 1

# Test 3: Send rapid messages
echo "⚡ Sending rapid messages..."
for i in {1..5}; do
    publish_message "chat" "Rapid message #$i - $(date +%H:%M:%S)"
    sleep 0.5
done

echo ""
echo "✅ Test completed!"
echo "Check your Pub/Sub Viewer for all messages"
echo "You should see real-time message delivery" 