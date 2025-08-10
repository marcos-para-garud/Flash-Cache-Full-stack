import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import Layout from './components/Layout/Layout';
import KeyExplorer from './components/KeyExplorer/KeyExplorer';
import ClusterView from './components/ClusterView/ClusterView';
import Monitoring from './components/Monitoring/Monitoring';
import TTLPlayground from './components/TTLPlayground/TTLPlayground';
import LRUDemo from './components/LRUDemo/LRUDemo';
import PubSubViewer from './components/PubSubViewer/PubSubViewer';
import MasterSlaveReplication from './components/MasterSlaveReplication/MasterSlaveReplication';
import CLIConsole from './components/CLIConsole/CLIConsole';
import RDBPersistence from './components/RDBPersistence/RDBPersistence';
import ProcessMonitor from './components/ProcessMonitor/ProcessMonitor';

function App() {
  const { theme } = useAppStore();
  // const { isConnected } = useWebSocket(); // Commented out to fix eslint warning

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className={`App ${theme}`}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/keys" replace />} />
            <Route path="/keys" element={<KeyExplorer />} />
            <Route path="/cluster" element={<ClusterView />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/ttl" element={<TTLPlayground />} />
            <Route path="/lru" element={<LRUDemo />} />
            <Route path="/pubsub" element={<PubSubViewer />} />
            <Route path="/replication" element={<MasterSlaveReplication />} />
            <Route path="/cli" element={<CLIConsole />} />
            <Route path="/persistence" element={<RDBPersistence />} />
            <Route path="/processes" element={<ProcessMonitor />} />
          </Routes>
        </Layout>
      </Router>
    </div>
  );
}

export default App; 