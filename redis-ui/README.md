# Redis UI - Interactive Database Management Interface

A modern, responsive React-based UI for managing and monitoring Redis databases with advanced features including TTL playground, LRU cache demonstration, cluster visualization, and real-time monitoring.

## 🚀 Features

### Core Features
- **Dashboard**: Overview with key metrics and quick actions
- **Key Explorer**: File manager-style interface for browsing Redis keys
- **Cluster View**: Network diagram showing node relationships and health
- **Real-time Monitoring**: Performance charts and metrics visualization
- **Settings**: Configuration panels with form validation

### Interactive Demonstrations
- **TTL Playground**: Set keys with various TTL values and watch real-time countdown
- **LRU Cache Demo**: Add items beyond max capacity and see eviction patterns
- **Combined TTL + LRU**: Demonstrate how both mechanisms work together

### Advanced Features
- **Real-time Updates**: WebSocket connections for live data
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Theme**: User preference support
- **Keyboard Shortcuts**: Power user productivity features
- **Context Menus**: Right-click actions for efficiency
- **Notifications**: Real-time alerts and status updates

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router DOM
- **Real-time**: WebSocket API
- **HTTP Client**: Axios

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- **Redis server** running (for backend connectivity)

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
# Navigate to the project directory
cd redis-ui

# Install all dependencies
npm install

# Or using yarn
yarn install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

### 3. Start the Development Server

```bash
# Start the React development server
npm start

# Or using yarn
yarn start
```

The application will open at `http://localhost:3000`

### 4. Backend Setup

Make sure your Redis backend server is running on port 3001. The backend should provide the following API endpoints:

- `GET /keys` - List all keys
- `GET /get?key={key}` - Get key value
- `POST /set` - Set key value with optional TTL
- `DELETE /delete?key={key}` - Delete key
- `GET /ttl?key={key}` - Get key TTL
- `GET /info` - Redis server info
- `GET /stats` - Server statistics
- `GET /cluster/stats` - Cluster statistics
- `GET /cluster/nodes` - Node information
- `GET /metrics` - Performance metrics

WebSocket endpoint at `ws://localhost:3001` for real-time updates.

## 🎯 Usage

### Dashboard
- View key metrics and cluster health
- Access quick actions for common tasks
- Monitor real-time performance

### TTL Playground
1. Add keys with custom TTL values
2. Watch real-time countdown timers
3. See automatic deletion when keys expire
4. Reset TTL or manually delete keys

### LRU Cache Demo
1. Set maximum cache capacity
2. Add items beyond capacity
3. Observe LRU eviction patterns
4. Access items to see reordering

### Key Explorer
- Browse all Redis keys in a file manager interface
- Filter by type, node, or TTL status
- Perform CRUD operations on keys
- Context menu for quick actions

### Cluster View
- Visualize cluster topology
- Monitor node health status
- View memory usage and connections
- Track key distribution across nodes

### Monitoring
- Real-time performance charts
- Memory usage tracking
- Request/response metrics
- Connection monitoring

## ⌨️ Keyboard Shortcuts

- `Cmd/Ctrl + 1-7`: Navigate between views
- `Cmd/Ctrl + B`: Toggle sidebar
- `Cmd/Ctrl + K`: Focus search
- `Shift + D`: Toggle dark mode
- `Escape`: Clear selection/close modals
- `Delete`: Delete selected keys
- `F5`: Refresh data

## 🎨 Customization

### Theme Colors
The app uses a custom color palette defined in `tailwind.config.js`:
- **Primary**: Blue gradient (0ea5e9)
- **Secondary**: Purple gradient (d946ef)
- **Accent**: Orange gradient (f97316)
- **Success**: Green (22c55e)
- **Warning**: Yellow (f59e0b)
- **Error**: Red (ef4444)

### Dark Mode
Automatically respects system preferences with manual toggle support.

## 🔧 Development

### Available Scripts
- `npm start`: Development server
- `npm build`: Production build
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

### Project Structure
```
src/
├── components/          # React components
│   ├── Dashboard/       # Dashboard views
│   ├── TTLPlayground/   # TTL demonstration
│   ├── LRUDemo/         # LRU cache demo
│   ├── KeyExplorer/     # Key management
│   ├── ClusterView/     # Cluster visualization
│   ├── Monitoring/      # Performance monitoring
│   ├── Settings/        # Configuration
│   └── Layout/          # Layout components
├── hooks/               # Custom React hooks
├── services/            # API and WebSocket services
├── store/               # Zustand state management
├── types/               # TypeScript definitions
├── utils/               # Utility functions
└── styles/              # Additional CSS
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include browser console logs if applicable

## 🙏 Acknowledgments

- Redis team for the excellent database
- React team for the amazing framework
- Tailwind CSS for the utility-first styling
- Lucide for the beautiful icons 