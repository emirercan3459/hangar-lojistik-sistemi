import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, Truck, Activity } from 'lucide-react';
import './Dashboard.css';

const API_URL = 'http://localhost:8000/api';

const Dashboard = () => {
  const [stats, setStats] = useState({ total_products: 0, critical_alerts: 0, total_shipments: 0 });
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = () => {
    axios.get(`${API_URL}/alerts`).then(res => setAlerts(res.data));
  };

  const handleResolveAlert = (alertId) => {
    axios.post(`${API_URL}/alerts/${alertId}/resolve`)
      .then(() => {
        fetchAlerts();
        axios.get(`${API_URL}/dashboard/stats`).then(res => setStats(res.data));
      })
      .catch(err => alert("Uyarı çözülemedi: " + err.message));
  };

  useEffect(() => {
    // Dashboard istatistiklerini getir
    axios.get(`${API_URL}/dashboard/stats`).then(res => setStats(res.data));
    // Ürünleri getir
    axios.get(`${API_URL}/products?limit=5`).then(res => setProducts(res.data));
    // Son 5 logu getir
    axios.get(`${API_URL}/logs?limit=5`).then(res => setLogs(res.data));
    fetchAlerts();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Hangar Lojistik Yönetimi</h1>
      </header>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <h3>Toplam Ürün Çeşidi</h3>
            <p className="stat-value">{stats.total_products}</p>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => { fetchAlerts(); setShowAlertsModal(true); }}>
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <h3>Kritik Stok Uyarıları</h3>
            <p className="stat-value">{stats.critical_alerts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Truck size={24} />
          </div>
          <div className="stat-info">
            <h3>Aktif Sevkiyatlar</h3>
            <p className="stat-value">{stats.total_shipments}</p>
          </div>
        </div>
      </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="content-section">
          <h2>Ürün Envanteri Özeti</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Ürün Adı</th>
                <th>Toplam Stok</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map(product => (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td><strong>{product.total_stock}</strong></td>
                  <td>
                    {product.total_stock <= product.critical_stock_level ? (
                      <span className="badge danger">Kritik Stok</span>
                    ) : (
                      <span className="badge success">Yeterli</span>
                    )}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">Sistemde henüz ürün yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="content-section" style={{ backgroundColor: '#f8fafc' }}>
          <h2><Activity size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#3b82f6' }} /> Son Sistem Hareketleri</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.map(log => (
              <div key={log.id} style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>{formatDate(log.created_at)} • @{log.actor}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '3px' }}>
                  {log.action_type.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{log.description}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Henüz kaydedilmiş hareket yok.</p>
            )}
          </div>
        </div>
      </div>

      {/* KRİTİK STOK UYARILARI MODALI */}
      {showAlertsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '650px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} />
                Kritik Stok Uyarıları
              </h3>
              <button 
                onClick={() => setShowAlertsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Mesaj</th>
                    <th>Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(alert => (
                    <tr key={alert.id}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(alert.created_at)}</td>
                      <td style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{alert.message}</td>
                      <td>
                        <button 
                          className="success-btn" 
                          style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Çözüldü
                        </button>
                      </td>
                    </tr>
                  ))}
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center" style={{ padding: '20px' }}>Kritik seviyede ürün bulunmamaktadır.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
