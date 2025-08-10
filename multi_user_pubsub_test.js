const io = require('socket.io-client');
const readline = require('readline');

class MultiUserPubSubTest {
    constructor(serverUrl = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
        this.users = [];
        this.activeUser = null;
        this.rl = null;
    }

    // Create multiple named users
    createUsers() {
        const userNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        
        console.log(`👥 Creating ${userNames.length} test users...`);
        
        userNames.forEach((name, index) => {
            const socket = io(this.serverUrl);
            const user = {
                name,
                socket,
                channels: new Set(),
                messagesSent: 0,
                messagesReceived: 0
            };
            
            socket.on('connect', () => {
                console.log(`✅ ${name} connected (${socket.id})`);
            });
            
            socket.on('message', (data) => {
                user.messagesReceived++;
                const timestamp = new Date().toLocaleTimeString();
                console.log(`📨 [${timestamp}] ${name} received on #${data.channel}: "${data.message}"`);
            });
            
            socket.on('subscribed', (data) => {
                user.channels.add(data.channel);
                console.log(`🔔 ${name} subscribed to #${data.channel}`);
            });
            
            socket.on('unsubscribed', (data) => {
                user.channels.delete(data.channel);
                console.log(`🔕 ${name} unsubscribed from #${data.channel}`);
            });
            
            socket.on('disconnect', () => {
                console.log(`❌ ${name} disconnected`);
            });
            
            this.users.push(user);
        });
        
        this.activeUser = this.users[0]; // Default to first user
    }

    // Subscribe user(s) to a channel
    async subscribeUser(userName, channel) {
        const user = this.users.find(u => u.name.toLowerCase() === userName.toLowerCase());
        if (!user) {
            console.log(`❌ User ${userName} not found`);
            return;
        }
        
        user.socket.emit('subscribe', channel);
        await this.sleep(100);
    }

    // Subscribe all users to a channel
    async subscribeAllUsers(channel) {
        console.log(`📡 Subscribing all users to #${channel}`);
        for (const user of this.users) {
            user.socket.emit('subscribe', channel);
            await this.sleep(100);
        }
    }

    // Publish message as a specific user
    async publishAsUser(userName, channel, message) {
        const user = this.users.find(u => u.name.toLowerCase() === userName.toLowerCase());
        if (!user) {
            console.log(`❌ User ${userName} not found`);
            return;
        }

        try {
            const fetch = (await import('node-fetch')).default;
            const fullMessage = `${userName}: ${message}`;
            
            const response = await fetch(`${this.serverUrl}/api/pubsub/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, message: fullMessage })
            });
            
            const result = await response.json();
            if (result.success) {
                user.messagesSent++;
                console.log(`📤 ${userName} sent message to #${channel} (${result.data.subscribers} subscribers)`);
            } else {
                console.log(`❌ Failed to publish: ${result.error}`);
            }
        } catch (error) {
            console.error(`❌ Error publishing: ${error.message}`);
        }
    }

    // Interactive chat mode
    async startInteractiveChat() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(`\n💬 MULTI-USER CHAT MODE`);
        console.log(`========================`);
        console.log(`Commands:`);
        console.log(`  <message>                    - Send message as current user`);
        console.log(`  /user <name>                 - Switch active user`);
        console.log(`  /channel <channel>           - Switch channel`);
        console.log(`  /join <channel>              - Join a channel (current user)`);
        console.log(`  /join-all <channel>          - All users join channel`);
        console.log(`  /leave <channel>             - Leave a channel (current user)`);
        console.log(`  /users                       - List all users`);
        console.log(`  /status                      - Show user status`);
        console.log(`  /scenario <name>             - Run predefined scenario`);
        console.log(`  /help                        - Show commands`);
        console.log(`  /quit                        - Exit`);
        console.log(``);
        console.log(`Current user: ${this.activeUser.name}`);
        console.log(`Current channel: general (join with '/join general')`);
        console.log(``);

        this.askForInput();
    }

    askForInput() {
        const channelList = Array.from(this.activeUser.channels);
        const channelDisplay = channelList.length > 0 ? channelList.join(', ') : 'none';
        
        this.rl.question(`[${this.activeUser.name}] channels(${channelDisplay})> `, async (input) => {
            await this.handleCommand(input.trim());
            this.askForInput();
        });
    }

    async handleCommand(input) {
        if (input.startsWith('/')) {
            const [command, ...args] = input.slice(1).split(' ');
            
            switch (command.toLowerCase()) {
                case 'user':
                    if (args.length > 0) {
                        const userName = args[0];
                        const user = this.users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                        if (user) {
                            this.activeUser = user;
                            console.log(`👤 Switched to user: ${user.name}`);
                        } else {
                            console.log(`❌ User ${userName} not found`);
                        }
                    } else {
                        console.log('Usage: /user <name>');
                    }
                    break;

                case 'join':
                    if (args.length > 0) {
                        await this.subscribeUser(this.activeUser.name, args[0]);
                    } else {
                        console.log('Usage: /join <channel>');
                    }
                    break;

                case 'join-all':
                    if (args.length > 0) {
                        await this.subscribeAllUsers(args[0]);
                    } else {
                        console.log('Usage: /join-all <channel>');
                    }
                    break;

                case 'leave':
                    if (args.length > 0) {
                        this.activeUser.socket.emit('unsubscribe', args[0]);
                    } else {
                        console.log('Usage: /leave <channel>');
                    }
                    break;

                case 'users':
                    this.showUsers();
                    break;

                case 'status':
                    this.showDetailedStatus();
                    break;

                case 'scenario':
                    if (args.length > 0) {
                        await this.runScenario(args[0]);
                    } else {
                        this.listScenarios();
                    }
                    break;

                case 'help':
                    this.showHelp();
                    break;

                case 'quit':
                    this.cleanup();
                    process.exit(0);
                    break;

                default:
                    console.log(`❌ Unknown command: ${command}`);
            }
        } else if (input.length > 0) {
            // Send message to all channels the user is subscribed to
            const channels = Array.from(this.activeUser.channels);
            if (channels.length === 0) {
                console.log(`❌ You're not subscribed to any channels. Use /join <channel> first.`);
                return;
            }

            // Send to the first channel by default, or ask user to specify
            const channel = channels[0];
            await this.publishAsUser(this.activeUser.name, channel, input);
        }
    }

    showUsers() {
        console.log(`👥 Active Users:`);
        this.users.forEach(user => {
            const status = user.socket.connected ? '🟢' : '🔴';
            const channels = Array.from(user.channels).join(', ') || 'none';
            const current = user === this.activeUser ? ' (current)' : '';
            console.log(`  ${status} ${user.name}${current} - channels: ${channels}`);
        });
    }

    showDetailedStatus() {
        console.log(`📊 DETAILED STATUS:`);
        this.users.forEach(user => {
            const status = user.socket.connected ? '🟢 Connected' : '🔴 Disconnected';
            console.log(`\n  ${user.name}:`);
            console.log(`    Status: ${status}`);
            console.log(`    Channels: ${Array.from(user.channels).join(', ') || 'none'}`);
            console.log(`    Messages sent: ${user.messagesSent}`);
            console.log(`    Messages received: ${user.messagesReceived}`);
        });
    }

    showHelp() {
        console.log(`\n💡 HELP:`);
        console.log(`This is a multi-user Pub/Sub testing environment.`);
        console.log(`Each user can subscribe to channels and send messages.`);
        console.log(`Messages are broadcast to all users subscribed to the same channel.`);
        console.log(`Use /scenario to run predefined conversation scenarios.`);
    }

    listScenarios() {
        console.log(`🎭 Available scenarios:`);
        console.log(`  chat-room    - Simulate a busy chat room`);
        console.log(`  team-meeting - Simulate a team meeting discussion`);
        console.log(`  gaming       - Simulate gaming chat`);
        console.log(`  multi-channel - Test multiple channels`);
    }

    async runScenario(scenarioName) {
        console.log(`🎭 Running scenario: ${scenarioName}`);
        
        switch (scenarioName.toLowerCase()) {
            case 'chat-room':
                await this.chatRoomScenario();
                break;
            case 'team-meeting':
                await this.teamMeetingScenario();
                break;
            case 'gaming':
                await this.gamingScenario();
                break;
            case 'multi-channel':
                await this.multiChannelScenario();
                break;
            default:
                console.log(`❌ Unknown scenario: ${scenarioName}`);
                this.listScenarios();
        }
    }

    async chatRoomScenario() {
        console.log(`💬 Starting chat room scenario...`);
        
        // All users join general channel
        await this.subscribeAllUsers('general');
        await this.sleep(1000);
        
        const conversations = [
            ['Alice', 'general', 'Hey everyone! How\'s it going? 👋'],
            ['Bob', 'general', 'Hey Alice! Good here, working on some Redis testing'],
            ['Charlie', 'general', 'Oh nice! I love the pub/sub features'],
            ['Diana', 'general', 'Same here! The real-time messaging is so smooth'],
            ['Eve', 'general', 'Anyone want to grab lunch later?'],
            ['Alice', 'general', 'I\'m in! Where should we go?'],
            ['Bob', 'general', 'How about that new place downtown?'],
            ['Charlie', 'general', 'Sounds good to me! 🍕']
        ];
        
        for (const [user, channel, message] of conversations) {
            await this.publishAsUser(user, channel, message);
            await this.sleep(1500);
        }
        
        console.log(`✅ Chat room scenario completed!`);
    }

    async teamMeetingScenario() {
        console.log(`👥 Starting team meeting scenario...`);
        
        await this.subscribeAllUsers('team-meeting');
        await this.sleep(1000);
        
        const meeting = [
            ['Alice', 'team-meeting', 'Good morning everyone! Let\'s start our standup'],
            ['Bob', 'team-meeting', 'Morning! I finished the authentication module yesterday'],
            ['Charlie', 'team-meeting', 'Great! I\'m working on the frontend integration'],
            ['Diana', 'team-meeting', 'I found a bug in the caching layer, fixing it today'],
            ['Eve', 'team-meeting', 'I\'ll review everyone\'s PRs this afternoon'],
            ['Alice', 'team-meeting', 'Perfect! Any blockers?'],
            ['Bob', 'team-meeting', 'I need Diana\'s cache fix before I can test my module'],
            ['Diana', 'team-meeting', 'I\'ll have it done by noon'],
            ['Alice', 'team-meeting', 'Excellent! Thanks everyone! 🚀']
        ];
        
        for (const [user, channel, message] of meeting) {
            await this.publishAsUser(user, channel, message);
            await this.sleep(2000);
        }
        
        console.log(`✅ Team meeting scenario completed!`);
    }

    async gamingScenario() {
        console.log(`🎮 Starting gaming scenario...`);
        
        await this.subscribeAllUsers('game-lobby');
        await this.sleep(1000);
        
        const gaming = [
            ['Alice', 'game-lobby', 'Who wants to start a new match?'],
            ['Bob', 'game-lobby', 'I\'m in! What game?'],
            ['Charlie', 'game-lobby', 'How about some co-op?'],
            ['Diana', 'game-lobby', 'Count me in! 🎯'],
            ['Eve', 'game-lobby', 'Starting lobby... join code: ABC123'],
            ['Alice', 'game-lobby', 'Joined! Ready when you are'],
            ['Bob', 'game-lobby', 'Ready! Let\'s do this! ⚔️'],
            ['Charlie', 'game-lobby', 'Game starting in 3... 2... 1...'],
            ['Diana', 'game-lobby', 'GL HF everyone! 🔥']
        ];
        
        for (const [user, channel, message] of gaming) {
            await this.publishAsUser(user, channel, message);
            await this.sleep(1000);
        }
        
        console.log(`✅ Gaming scenario completed!`);
    }

    async multiChannelScenario() {
        console.log(`📡 Starting multi-channel scenario...`);
        
        // Users join different combinations of channels
        await this.subscribeUser('Alice', 'general');
        await this.subscribeUser('Alice', 'announcements');
        await this.subscribeUser('Bob', 'general');
        await this.subscribeUser('Bob', 'tech-talk');
        await this.subscribeUser('Charlie', 'tech-talk');
        await this.subscribeUser('Charlie', 'announcements');
        await this.subscribeUser('Diana', 'general');
        await this.subscribeUser('Eve', 'announcements');
        
        await this.sleep(1000);
        
        const messages = [
            ['Alice', 'general', 'Anyone around?'],
            ['Bob', 'general', 'Yep! Just testing the channels'],
            ['Charlie', 'tech-talk', 'Check out this new Redis feature!'],
            ['Bob', 'tech-talk', 'Oh cool! Tell me more'],
            ['Eve', 'announcements', '🚨 Server maintenance at 3pm today'],
            ['Alice', 'announcements', 'Thanks for the heads up!'],
            ['Diana', 'general', 'Channels working perfectly! 📡'],
            ['Charlie', 'announcements', 'Great system we have here! 👍']
        ];
        
        for (const [user, channel, message] of messages) {
            await this.publishAsUser(user, channel, message);
            await this.sleep(1500);
        }
        
        console.log(`✅ Multi-channel scenario completed!`);
    }

    cleanup() {
        console.log(`\n🧹 Cleaning up...`);
        this.users.forEach(user => {
            user.socket.disconnect();
        });
        if (this.rl) {
            this.rl.close();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main execution
async function main() {
    console.log(`👥 MULTI-USER PUB/SUB TESTING`);
    console.log(`==============================`);
    
    const tester = new MultiUserPubSubTest();
    
    const mode = process.argv[2] || 'interactive';
    
    if (mode === 'scenario' && process.argv[3]) {
        tester.createUsers();
        await tester.sleep(2000);
        await tester.runScenario(process.argv[3]);
    } else {
        tester.createUsers();
        await tester.sleep(2000);
        await tester.startInteractiveChat();
    }
    
    process.on('SIGINT', () => {
        tester.cleanup();
        process.exit(0);
    });
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MultiUserPubSubTest; 