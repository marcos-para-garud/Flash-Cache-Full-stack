const io = require('socket.io-client');
const readline = require('readline');

class PubSubSimulator {
    constructor(serverUrl = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
        this.clients = [];
        this.messageCount = 0;
    }

    // Create multiple WebSocket clients
    createClients(count = 3) {
        console.log(`🔌 Creating ${count} WebSocket clients...`);
        
        for (let i = 0; i < count; i++) {
            const client = io(this.serverUrl);
            const clientId = `Client-${i + 1}`;
            
            client.on('connect', () => {
                console.log(`✅ ${clientId} connected (${client.id})`);
            });
            
            client.on('message', (data) => {
                console.log(`📨 ${clientId} received: [${data.channel}] ${data.message}`);
            });
            
            client.on('subscribed', (data) => {
                console.log(`🔔 ${clientId} subscribed to channel: ${data.channel}`);
            });
            
            client.on('unsubscribed', (data) => {
                console.log(`🔕 ${clientId} unsubscribed from channel: ${data.channel}`);
            });
            
            client.on('disconnect', () => {
                console.log(`❌ ${clientId} disconnected`);
            });
            
            this.clients.push({ id: clientId, socket: client });
        }
    }

    // Subscribe specific clients to channels
    async subscribeClients(channel = 'chat') {
        console.log(`\n📡 Subscribing all clients to channel: ${channel}`);
        
        for (const client of this.clients) {
            client.socket.emit('subscribe', channel);
            await this.sleep(100); // Small delay between subscriptions
        }
    }

    // Publish messages from different clients
    async publishMessages(channel = 'chat') {
        console.log(`\n📤 Publishing messages to channel: ${channel}`);
        
        const messages = [
            "Hello from Client-1! 👋",
            "Client-2 here, testing pub/sub! 🚀", 
            "Client-3 sending a message! 💬",
            "This is a broadcast message! 📢",
            "Real-time messaging works! ⚡"
        ];
        
        for (let i = 0; i < messages.length; i++) {
            const clientIndex = i % this.clients.length;
            const client = this.clients[clientIndex];
            
            console.log(`📤 ${client.id} publishing: ${messages[i]}`);
            
            // Use HTTP API to publish (simulates external publisher)
            try {
                const fetch = (await import('node-fetch')).default;
                await fetch(`${this.serverUrl}/api/pubsub/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channel, message: messages[i] })
                });
                
                await this.sleep(1000); // Wait 1 second between messages
            } catch (error) {
                console.error(`❌ Failed to publish message: ${error.message}`);
            }
        }
    }

    // Interactive mode for manual testing
    async interactiveMode() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(`\n🎮 INTERACTIVE MODE`);
        console.log(`Commands:`);
        console.log(`  publish <channel> <message> - Publish a message`);
        console.log(`  subscribe <channel>         - Subscribe all clients to channel`);
        console.log(`  unsubscribe <channel>       - Unsubscribe all clients from channel`);
        console.log(`  status                      - Show client status`);
        console.log(`  quit                        - Exit`);
        console.log(``);

        const askQuestion = () => {
            rl.question('> ', async (input) => {
                const [command, ...args] = input.trim().split(' ');
                
                switch (command.toLowerCase()) {
                    case 'publish':
                        if (args.length >= 2) {
                            const channel = args[0];
                            const message = args.slice(1).join(' ');
                            await this.publishSingleMessage(channel, message);
                        } else {
                            console.log('Usage: publish <channel> <message>');
                        }
                        break;
                        
                    case 'subscribe':
                        if (args.length >= 1) {
                            await this.subscribeClients(args[0]);
                        } else {
                            console.log('Usage: subscribe <channel>');
                        }
                        break;
                        
                    case 'unsubscribe':
                        if (args.length >= 1) {
                            await this.unsubscribeClients(args[0]);
                        } else {
                            console.log('Usage: unsubscribe <channel>');
                        }
                        break;
                        
                    case 'status':
                        this.showStatus();
                        break;
                        
                    case 'quit':
                        this.cleanup();
                        rl.close();
                        process.exit(0);
                        return;
                        
                    default:
                        console.log('Unknown command. Type "quit" to exit.');
                }
                
                askQuestion();
            });
        };

        askQuestion();
    }

    async publishSingleMessage(channel, message) {
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(`${this.serverUrl}/api/pubsub/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, message })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log(`✅ Published to ${result.data.subscribers} subscribers`);
            } else {
                console.log(`❌ Failed to publish: ${result.error}`);
            }
        } catch (error) {
            console.error(`❌ Error publishing: ${error.message}`);
        }
    }

    async unsubscribeClients(channel) {
        console.log(`🔕 Unsubscribing all clients from channel: ${channel}`);
        
        for (const client of this.clients) {
            client.socket.emit('unsubscribe', channel);
            await this.sleep(100);
        }
    }

    showStatus() {
        console.log(`\n📊 CLIENT STATUS:`);
        console.log(`Connected clients: ${this.clients.length}`);
        this.clients.forEach(client => {
            const status = client.socket.connected ? '🟢 Connected' : '🔴 Disconnected';
            console.log(`  ${client.id}: ${status} (${client.socket.id})`);
        });
    }

    cleanup() {
        console.log(`\n🧹 Cleaning up clients...`);
        this.clients.forEach(client => {
            client.socket.disconnect();
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Demo mode - automated test sequence
    async demoMode() {
        console.log(`\n🎬 DEMO MODE - Automated Pub/Sub Test`);
        console.log(`=====================================`);
        
        console.log(`\n1️⃣ Creating clients...`);
        this.createClients(3);
        
        await this.sleep(2000);
        
        console.log(`\n2️⃣ Subscribing to 'chat' channel...`);
        await this.subscribeClients('chat');
        
        await this.sleep(1000);
        
        console.log(`\n3️⃣ Publishing test messages...`);
        await this.publishMessages('chat');
        
        await this.sleep(2000);
        
        console.log(`\n4️⃣ Testing different channel...`);
        await this.subscribeClients('notifications');
        await this.publishSingleMessage('notifications', 'System notification: Demo complete! 🎉');
        
        await this.sleep(1000);
        
        console.log(`\n✅ Demo completed! Press Ctrl+C to exit or type 'interactive' for manual mode.`);
    }
}

// Main execution
async function main() {
    console.log(`🧪 REDIS PUB/SUB SIMULATOR`);
    console.log(`=========================`);
    
    const simulator = new PubSubSimulator();
    
    const mode = process.argv[2] || 'demo';
    
    if (mode === 'interactive') {
        simulator.createClients(3);
        await simulator.sleep(2000);
        await simulator.interactiveMode();
    } else {
        await simulator.demoMode();
        
        // Keep process alive for interactive commands
        process.stdin.resume();
        
        process.on('SIGINT', () => {
            simulator.cleanup();
            process.exit(0);
        });
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PubSubSimulator; 