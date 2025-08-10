const { createHash } = require('crypto');

class SampleDataGenerator {
  constructor() {
    this.data = new Map(); // Our in-memory store
    this.ttlData = new Map(); // TTL tracking
    this.pubsubChannels = new Map(); // Pub/sub channels
  }

  // Generate hash for consistent node assignment
  hash(key) {
    return createHash('sha256').update(key).digest('hex');
  }

  // Simulate setting a key with optional TTL
  set(key, value, ttl = null) {
    this.data.set(key, value);
    if (ttl) {
      this.ttlData.set(key, Date.now() + (ttl * 1000));
    }
    console.log(`✅ Set key: ${key} (type: ${typeof value}, ttl: ${ttl || 'none'})`);
  }

  // Generate sample user data
  generateUserData() {
    console.log('📊 Generating user data...');
    
    const users = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', lastLogin: '2024-01-15T10:30:00Z' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', lastLogin: '2024-01-15T09:15:00Z' },
      { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'moderator', lastLogin: '2024-01-15T11:45:00Z' },
      { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'user', lastLogin: '2024-01-15T08:30:00Z' },
      { id: 5, name: 'Eve Wilson', email: 'eve@example.com', role: 'admin', lastLogin: '2024-01-15T14:20:00Z' }
    ];

    users.forEach(user => {
      // User profile data
      this.set(`user:${user.id}:profile`, JSON.stringify(user));
      
      // User session data (short TTL - 1 hour)
      this.set(`user:${user.id}:session`, `session_${Date.now()}_${user.id}`, 3600);
      
      // User cache (medium TTL - 30 minutes)
      this.set(`user:${user.id}:cache`, JSON.stringify({
        preferences: { theme: 'dark', language: 'en' },
        recentActivity: [`action_${Date.now()}`, `action_${Date.now() - 1000}`]
      }), 1800);

      // User online status (short TTL - 5 minutes)
      this.set(`user:${user.id}:online`, 'true', 300);
    });

    // User stats
    this.set('users:total', users.length.toString());
    this.set('users:active_today', '12');
    this.set('users:new_registrations', '3');
  }

  // Generate application metrics
  generateAppMetrics() {
    console.log('📈 Generating application metrics...');
    
    // Real-time metrics (very short TTL - 1 minute)
    this.set('metrics:cpu_usage', (Math.random() * 100).toFixed(2), 60);
    this.set('metrics:memory_usage', (Math.random() * 8192).toFixed(0), 60);
    this.set('metrics:active_connections', Math.floor(Math.random() * 100 + 50).toString(), 60);
    this.set('metrics:requests_per_second', Math.floor(Math.random() * 500 + 100).toString(), 60);

    // Daily metrics (long TTL - 24 hours)
    this.set('metrics:daily:page_views', '15420', 86400);
    this.set('metrics:daily:unique_visitors', '3200', 86400);
    this.set('metrics:daily:bounce_rate', '24.5', 86400);
    this.set('metrics:daily:avg_session_duration', '4.2', 86400);

    // API endpoint response times
    const endpoints = ['/api/users', '/api/posts', '/api/auth', '/api/metrics', '/api/analytics'];
    endpoints.forEach(endpoint => {
      const responseTime = (Math.random() * 500 + 50).toFixed(0);
      this.set(`api:response_time:${endpoint.replace('/', '_')}`, responseTime, 300);
    });
  }

  // Generate e-commerce sample data
  generateEcommerceData() {
    console.log('🛒 Generating e-commerce data...');
    
    const products = [
      { id: 'prod_001', name: 'Wireless Headphones', price: 129.99, stock: 45, category: 'electronics' },
      { id: 'prod_002', name: 'Smart Watch', price: 249.99, stock: 23, category: 'electronics' },
      { id: 'prod_003', name: 'Coffee Maker', price: 89.99, stock: 12, category: 'home' },
      { id: 'prod_004', name: 'Running Shoes', price: 119.99, stock: 67, category: 'sports' },
      { id: 'prod_005', name: 'Backpack', price: 59.99, stock: 34, category: 'accessories' }
    ];

    products.forEach(product => {
      // Product data
      this.set(`product:${product.id}`, JSON.stringify(product));
      
      // Product views (short TTL - 2 hours)
      this.set(`product:${product.id}:views`, Math.floor(Math.random() * 1000).toString(), 7200);
      
      // Product in cart counts (medium TTL - 1 hour) 
      this.set(`product:${product.id}:in_carts`, Math.floor(Math.random() * 20).toString(), 3600);
    });

    // Shopping carts (session-based, medium TTL)
    for (let i = 1; i <= 15; i++) {
      const cartItems = products.slice(0, Math.floor(Math.random() * 3) + 1);
      this.set(`cart:session_${i}`, JSON.stringify(cartItems), 3600);
    }

    // Sales data
    this.set('sales:today:total', '23450.75');
    this.set('sales:today:orders', '89');
    this.set('inventory:low_stock_alerts', '3');
  }

  // Generate social media data
  generateSocialData() {
    console.log('💬 Generating social media data...');
    
    // Posts
    for (let i = 1; i <= 25; i++) {
      const post = {
        id: i,
        user_id: Math.floor(Math.random() * 5) + 1,
        content: `This is sample post #${i} with some interesting content!`,
        likes: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 20),
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
      };
      
      this.set(`post:${i}`, JSON.stringify(post));
      
      // Post engagement (short TTL - 30 minutes)
      this.set(`post:${i}:engagement`, JSON.stringify({
        views: Math.floor(Math.random() * 500),
        clicks: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 15)
      }), 1800);
    }

    // Trending hashtags (medium TTL - 4 hours)
    const hashtags = ['#coding', '#javascript', '#redis', '#monitoring', '#devops'];
    hashtags.forEach((tag, index) => {
      this.set(`trending:${tag}`, (Math.floor(Math.random() * 1000) + 100).toString(), 14400);
    });

    // User feed caches (short TTL - 15 minutes)
    for (let userId = 1; userId <= 5; userId++) {
      const feedItems = Array.from({length: 10}, (_, i) => `post:${Math.floor(Math.random() * 25) + 1}`);
      this.set(`user:${userId}:feed`, JSON.stringify(feedItems), 900);
    }
  }

  // Generate gaming data
  generateGamingData() {
    console.log('🎮 Generating gaming data...');
    
    // Player stats
    for (let playerId = 1; playerId <= 20; playerId++) {
      const playerData = {
        level: Math.floor(Math.random() * 100) + 1,
        experience: Math.floor(Math.random() * 50000),
        coins: Math.floor(Math.random() * 10000),
        achievements: Math.floor(Math.random() * 25),
        last_played: new Date(Date.now() - Math.random() * 86400000).toISOString()
      };
      
      this.set(`player:${playerId}:stats`, JSON.stringify(playerData));
      
      // Player active session (short TTL - 10 minutes)
      if (Math.random() > 0.7) {
        this.set(`player:${playerId}:session`, `game_session_${Date.now()}`, 600);
      }
      
      // Leaderboard cache (medium TTL - 1 hour)
      this.set(`leaderboard:${playerId}`, playerData.experience.toString(), 3600);
    }

    // Game rooms (short TTL - 5 minutes)
    for (let roomId = 1; roomId <= 8; roomId++) {
      const roomData = {
        players: Math.floor(Math.random() * 4) + 1,
        status: Math.random() > 0.5 ? 'active' : 'waiting',
        created: Date.now()
      };
      this.set(`gameroom:${roomId}`, JSON.stringify(roomData), 300);
    }
  }

  // Generate financial data
  generateFinancialData() {
    console.log('💰 Generating financial data...');
    
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH'];
    
    // Exchange rates (medium TTL - 5 minutes for real-time feel)
    currencies.forEach(currency => {
      const rate = (Math.random() * 2 + 0.5).toFixed(4);
      this.set(`exchange:${currency}:USD`, rate, 300);
    });

    // Trading data
    for (let i = 1; i <= 50; i++) {
      const trade = {
        id: `trade_${i}`,
        symbol: currencies[Math.floor(Math.random() * currencies.length)],
        amount: (Math.random() * 1000).toFixed(2),
        price: (Math.random() * 100).toFixed(2),
        timestamp: Date.now() - Math.random() * 3600000
      };
      
      this.set(`trade:${i}`, JSON.stringify(trade));
    }

    // Portfolio values (medium TTL - 30 minutes)
    for (let userId = 1; userId <= 10; userId++) {
      const portfolio = {
        total_value: (Math.random() * 100000).toFixed(2),
        day_change: ((Math.random() - 0.5) * 1000).toFixed(2),
        positions: Math.floor(Math.random() * 10) + 1
      };
      this.set(`portfolio:${userId}`, JSON.stringify(portfolio), 1800);
    }
  }

  // Generate IoT sensor data
  generateIoTData() {
    console.log('🌡️ Generating IoT sensor data...');
    
    const sensors = [
      { id: 'temp_001', type: 'temperature', location: 'server_room' },
      { id: 'humid_001', type: 'humidity', location: 'server_room' },
      { id: 'temp_002', type: 'temperature', location: 'office_a' },
      { id: 'temp_003', type: 'temperature', location: 'office_b' },
      { id: 'motion_001', type: 'motion', location: 'entrance' },
      { id: 'air_001', type: 'air_quality', location: 'main_hall' }
    ];

    sensors.forEach(sensor => {
      let value;
      switch (sensor.type) {
        case 'temperature':
          value = (Math.random() * 15 + 18).toFixed(1); // 18-33°C
          break;
        case 'humidity':
          value = (Math.random() * 40 + 30).toFixed(1); // 30-70%
          break;
        case 'motion':
          value = Math.random() > 0.8 ? 'detected' : 'clear';
          break;
        case 'air_quality':
          value = Math.floor(Math.random() * 100 + 50); // 50-150 AQI
          break;
        default:
          value = Math.random().toFixed(3);
      }
      
      // Current reading (very short TTL - 30 seconds)
      this.set(`sensor:${sensor.id}:current`, value.toString(), 30);
      
      // Sensor metadata
      this.set(`sensor:${sensor.id}:info`, JSON.stringify(sensor));
      
      // Historical data (longer TTL - 1 hour)
      const history = Array.from({length: 10}, () => ({
        timestamp: Date.now() - Math.random() * 3600000,
        value: typeof value === 'string' ? value : (parseFloat(value) + (Math.random() - 0.5) * 2).toFixed(1)
      }));
      this.set(`sensor:${sensor.id}:history`, JSON.stringify(history), 3600);
    });
  }

  // Generate cache data
  generateCacheData() {
    console.log('🗄️ Generating cache data...');
    
    // Page caches (medium TTL - 15 minutes)
    const pages = ['home', 'about', 'products', 'contact', 'blog', 'pricing'];
    pages.forEach(page => {
      const pageData = {
        content: `<html><!-- Cached ${page} page content --></html>`,
        generated: Date.now(),
        size: Math.floor(Math.random() * 50000) + 10000
      };
      this.set(`page_cache:${page}`, JSON.stringify(pageData), 900);
    });

    // API response caches (short TTL - 5 minutes)
    for (let i = 1; i <= 20; i++) {
      const cacheKey = `api_cache:endpoint_${i}`;
      const response = {
        data: { result: `cached_response_${i}`, count: Math.floor(Math.random() * 100) },
        cached_at: Date.now()
      };
      this.set(cacheKey, JSON.stringify(response), 300);
    }

    // Database query caches (medium TTL - 10 minutes)
    const queries = [
      'SELECT_users_WHERE_active',
      'SELECT_products_WHERE_category',
      'SELECT_orders_WHERE_date',
      'SELECT_analytics_WHERE_period'
    ];
    
    queries.forEach(query => {
      const queryResult = {
        rows: Math.floor(Math.random() * 1000),
        execution_time: (Math.random() * 100).toFixed(2),
        cached_at: Date.now()
      };
      this.set(`query_cache:${query}`, JSON.stringify(queryResult), 600);
    });
  }

  // Generate configuration data
  generateConfigData() {
    console.log('⚙️ Generating configuration data...');
    
    // Application settings (no TTL)
    const appConfig = {
      app_name: 'Redis Monitor Demo',
      version: '2.0.0',
      environment: 'production',
      debug: false,
      max_connections: 1000,
      timeout: 30000,
      features: {
        real_time_monitoring: true,
        alerting: true,
        analytics: true,
        clustering: true
      }
    };
    this.set('config:app', JSON.stringify(appConfig));

    // Feature flags (medium TTL - 2 hours)
    const features = [
      'new_dashboard', 'beta_analytics', 'advanced_search', 
      'real_time_chat', 'mobile_push', 'dark_mode'
    ];
    
    features.forEach(feature => {
      this.set(`feature_flag:${feature}`, Math.random() > 0.5 ? 'enabled' : 'disabled', 7200);
    });

    // Rate limits (short TTL - 1 minute)
    const rateLimits = ['api_calls', 'file_uploads', 'search_queries', 'exports'];
    rateLimits.forEach(limit => {
      this.set(`rate_limit:${limit}`, Math.floor(Math.random() * 100).toString(), 60);
    });
  }

  // Generate sample pub/sub data
  generatePubSubData() {
    console.log('📡 Generating pub/sub channels...');
    
    const channels = [
      'notifications',
      'chat',
      'alerts',
      'analytics',
      'system_events',
      'user_activity',
      'orders',
      'metrics_updates'
    ];

    channels.forEach(channel => {
      this.pubsubChannels.set(channel, {
        name: channel,
        subscriberCount: Math.floor(Math.random() * 10) + 1,
        lastActivity: new Date()
      });
    });
  }

  // Generate long-term TTL data (10 hours) for monitoring showcase
  generateLongTermTTLData() {
    console.log('⏰ Generating long-term TTL data (10 hours)...');
    
    const tenHours = 36000; // 10 hours in seconds
    
    // Long-term cached reports
    this.set('report:daily_analytics', JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      totalUsers: 15420,
      activeUsers: 8932,
      pageViews: 45782,
      conversionRate: 3.2,
      generatedAt: new Date().toISOString()
    }), tenHours);

    this.set('report:weekly_summary', JSON.stringify({
      week: `${new Date().getFullYear()}-W${Math.ceil((new Date().getDate())/7)}`,
      totalRevenue: 125847.32,
      newCustomers: 234,
      topProducts: ['Product A', 'Product B', 'Product C'],
      generatedAt: new Date().toISOString()
    }), tenHours);

    this.set('report:monthly_trends', JSON.stringify({
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      growthRate: 12.5,
      churnRate: 2.1,
      ltv: 450.00,
      generatedAt: new Date().toISOString()
    }), tenHours);

    // Long-term system configurations
    this.set('config:maintenance_window', JSON.stringify({
      nextMaintenance: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
      duration: '2 hours',
      type: 'routine',
      affectedServices: ['api', 'database'],
      scheduledAt: new Date().toISOString()
    }), tenHours);

    this.set('config:backup_schedule', JSON.stringify({
      lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      nextBackup: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      backupSize: '2.3 GB',
      status: 'healthy',
      scheduledAt: new Date().toISOString()
    }), tenHours);

    // Long-term business metrics
    this.set('metrics:customer_satisfaction', JSON.stringify({
      score: 4.6,
      responses: 1247,
      period: 'last_30_days',
      breakdown: { 5: 65, 4: 25, 3: 7, 2: 2, 1: 1 },
      updatedAt: new Date().toISOString()
    }), tenHours);

    this.set('metrics:system_health', JSON.stringify({
      uptime: '99.98%',
      lastIncident: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      avgResponseTime: '124ms',
      errorRate: '0.02%',
      checkedAt: new Date().toISOString()
    }), tenHours);

    // Long-term cache for expensive computations
    this.set('cache:ml_model_predictions', JSON.stringify({
      model: 'customer_churn_v2',
      predictions: 15420,
      accuracy: 94.2,
      lastTrained: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      computedAt: new Date().toISOString()
    }), tenHours);

    this.set('cache:recommendation_engine', JSON.stringify({
      version: '3.1.2',
      totalRecommendations: 45782,
      clickThroughRate: 8.4,
      lastUpdate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      computedAt: new Date().toISOString()
    }), tenHours);

    // Long-term audit logs
    this.set('audit:security_scan', JSON.stringify({
      scanId: `scan_${Date.now()}`,
      status: 'completed',
      vulnerabilities: 0,
      scannedAssets: 1247,
      completedAt: new Date().toISOString()
    }), tenHours);

    this.set('audit:compliance_check', JSON.stringify({
      checkId: `check_${Date.now()}`,
      framework: 'SOC2',
      status: 'passed',
      score: 98.5,
      checkedAt: new Date().toISOString()
    }), tenHours);

    // Long-term batch job results
    this.set('batch:data_aggregation', JSON.stringify({
      jobId: `job_${Date.now()}`,
      recordsProcessed: 2847291,
      executionTime: '45 minutes',
      status: 'completed',
      completedAt: new Date().toISOString()
    }), tenHours);

    this.set('batch:etl_pipeline', JSON.stringify({
      pipelineId: `etl_${Date.now()}`,
      sourceTables: 24,
      transformations: 156,
      outputRecords: 1847392,
      completedAt: new Date().toISOString()
    }), tenHours);

    // Long-term seasonal data
    this.set('seasonal:holiday_config', JSON.stringify({
      nextHoliday: 'New Year',
      promotions: ['winter_sale', 'holiday_special'],
      expectedTraffic: '+45%',
      preparedAt: new Date().toISOString()
    }), tenHours);

    this.set('seasonal:traffic_forecast', JSON.stringify({
      period: 'next_10_hours',
      expectedUsers: 12847,
      peakHour: '14:00',
      recommendation: 'scale_up',
      generatedAt: new Date().toISOString()
    }), tenHours);

    console.log('✅ Generated 15 long-term TTL keys (10 hours each)');
    
    // Add some immediate demo TTL keys for testing
    console.log('🔄 Adding immediate demo TTL keys...');
    
    // 5-minute demo keys
    this.set('demo:short_lived_1', 'Expires in 5 minutes', 300);
    this.set('demo:short_lived_2', 'Another 5-minute key', 300);
    this.set('demo:short_lived_3', 'Third 5-minute key', 300);
    
    // 30-minute demo keys  
    this.set('demo:medium_lived_1', 'Expires in 30 minutes', 1800);
    this.set('demo:medium_lived_2', 'Another 30-minute key', 1800);
    
    // 2-hour demo keys
    this.set('demo:long_lived_1', 'Expires in 2 hours', 7200);
    this.set('demo:long_lived_2', 'Another 2-hour key', 7200);
    
    console.log('✅ Generated 7 additional demo TTL keys');
  }

  // Generate all sample data
  generateAll() {
    console.log('🚀 Starting comprehensive sample data generation...\n');
    
    this.generateUserData();
    this.generateAppMetrics();
    this.generateEcommerceData();
    this.generateSocialData();
    this.generateGamingData();
    this.generateFinancialData();
    this.generateIoTData();
    this.generateCacheData();
    this.generateConfigData();
    this.generatePubSubData();
    this.generateLongTermTTLData(); // Call the new method here

    console.log(`\n✅ Sample data generation complete!`);
    console.log(`📊 Generated ${this.data.size} keys`);
    console.log(`⏰ Generated ${this.ttlData.size} keys with TTL`);
    console.log(`📡 Generated ${this.pubsubChannels.size} pub/sub channels`);
    
    return {
      keys: this.data,
      ttl: this.ttlData,
      channels: this.pubsubChannels
    };
  }

  // Get summary statistics
  getSummary() {
    const totalKeys = this.data.size;
    const ttlKeys = this.ttlData.size;
    const channels = this.pubsubChannels.size;
    
    // Calculate data size estimation
    let estimatedSize = 0;
    for (const [key, value] of this.data) {
      estimatedSize += key.length + JSON.stringify(value).length;
    }

    return {
      totalKeys,
      ttlKeys,
      channels,
      estimatedSizeBytes: estimatedSize,
      estimatedSizeKB: (estimatedSize / 1024).toFixed(2),
      nodeDistribution: this.getNodeDistribution()
    };
  }

  // Simulate node distribution for cluster view
  getNodeDistribution() {
    const nodes = ['node1', 'node2', 'node3'];
    const distribution = {};
    
    for (const node of nodes) {
      distribution[node] = {
        keyCount: 0,
        ttlKeys: 0,
        status: 'healthy'
      };
    }

    // Distribute keys across nodes based on hash
    for (const key of this.data.keys()) {
      const hashValue = this.hash(key);
      const nodeIndex = parseInt(hashValue.substr(0, 8), 16) % nodes.length;
      const nodeName = nodes[nodeIndex];
      
      distribution[nodeName].keyCount++;
      
      if (this.ttlData.has(key)) {
        distribution[nodeName].ttlKeys++;
      }
    }

    return distribution;
  }
}

module.exports = SampleDataGenerator; 