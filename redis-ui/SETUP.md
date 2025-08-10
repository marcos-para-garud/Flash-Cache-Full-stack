# Quick Setup Guide - Redis UI

## 🚀 Getting Started

Follow these steps to set up and run the Redis UI application:

### 1. Prerequisites
Make sure you have:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### 2. Install Dependencies
```bash
cd redis-ui
npm install
```

### 3. Start Development Server
```bash
npm start
```

The app will open at `http://localhost:3000`

### 4. Backend Connection (Optional)
If you want to connect to a real Redis backend:

1. Create a `.env` file in the redis-ui folder:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

2. Make sure your Redis backend server is running on port 3001

## 🎮 Demo Mode

The UI works in demo mode without a backend! You can:

- ✅ Explore all features
- ✅ Use TTL Playground with sample data
- ✅ Test LRU Cache Demo
- ✅ Navigate all views
- ✅ Try keyboard shortcuts
- ✅ Switch between light/dark themes

## 🔧 Available Commands

- `npm start` - Development server
- `npm build` - Production build
- `npm test` - Run tests

## 🎯 Key Features to Try

1. **TTL Playground** - Add keys with TTL and watch them expire
2. **LRU Demo** - See cache eviction in action
3. **Dark Mode** - Toggle with Shift+D
4. **Keyboard Shortcuts** - Press Cmd+1-7 to navigate

## 🐛 Troubleshooting

### Common Issues:

**Node modules error:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Port 3000 already in use:**
```bash
# The app will prompt to use a different port
# Press 'y' to accept
```

**TypeScript errors:**
```bash
# These are expected until dependencies are installed
npm install
```

## 📱 Mobile Testing

The UI is fully responsive! Test on:
- Desktop browsers
- Mobile browsers  
- Tablet browsers

## 🎨 Customization

Edit colors in `tailwind.config.js` to match your brand:
```js
colors: {
  primary: { 500: '#your-color' },
  // ... other colors
}
```

That's it! You're ready to explore the Redis UI! 🎉 