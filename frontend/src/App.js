import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Shipments from './pages/Shipments';
import Personnel from './pages/Personnel';
import Logs from './pages/Logs';
import SettingsPage from './pages/Settings';

import './components/Sidebar.css'; // Layout css'i sidebar içine sıkıştırdık

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/personnel" element={<Personnel />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
