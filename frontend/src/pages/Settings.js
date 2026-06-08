import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Navigation, Settings } from 'lucide-react';
import './Settings.css';

const API_URL = 'http://localhost:8000/api';

const SettingsPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Forms states
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', capacity_kg: '' });
  const [routeForm, setRouteForm] = useState({ start_point: '', end_point: '', distance_km: '', estimated_hours: '' });

  // Loading states
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchRoutes();
  }, []);

  const fetchVehicles = () => {
    axios.get(`${API_URL}/vehicles`)
      .then(res => setVehicles(res.data))
      .catch(err => console.error("Araçlar yüklenemedi", err));
  };

  const fetchRoutes = () => {
    axios.get(`${API_URL}/routes`)
      .then(res => setRoutes(res.data))
      .catch(err => console.error("Rotalar yüklenemedi", err));
  };

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    if (!vehicleForm.plate_number || !vehicleForm.capacity_kg) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
    setLoadingVehicles(true);
    axios.post(`${API_URL}/vehicles`, {
      plate_number: vehicleForm.plate_number,
      capacity_kg: parseFloat(vehicleForm.capacity_kg),
      is_active: true
    })
      .then(() => {
        fetchVehicles();
        setVehicleForm({ plate_number: '', capacity_kg: '' });
      })
      .catch(err => alert("Araç ekleme hatası: " + (err.response?.data?.detail || err.message)))
      .finally(() => setLoadingVehicles(false));
  };

  const handleRouteSubmit = (e) => {
    e.preventDefault();
    if (!routeForm.start_point || !routeForm.end_point || !routeForm.distance_km || !routeForm.estimated_hours) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
    setLoadingRoutes(true);
    axios.post(`${API_URL}/routes`, {
      start_point: routeForm.start_point,
      end_point: routeForm.end_point,
      distance_km: parseFloat(routeForm.distance_km),
      estimated_hours: parseFloat(routeForm.estimated_hours)
    })
      .then(() => {
        fetchRoutes();
        setRouteForm({ start_point: '', end_point: '', distance_km: '', estimated_hours: '' });
      })
      .catch(err => alert("Rota ekleme hatası: " + (err.response?.data?.detail || err.message)))
      .finally(() => setLoadingRoutes(false));
  };

  const handleDeleteVehicle = (id, plate) => {
    if (!window.confirm(`"${plate}" aracı silinecek. Emin misiniz?`)) return;
    axios.delete(`${API_URL}/vehicles/${id}`)
      .then(() => fetchVehicles())
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  const handleDeleteRoute = (id, label) => {
    if (!window.confirm(`"${label}" rotası silinecek. Emin misiniz?`)) return;
    axios.delete(`${API_URL}/routes/${id}`)
      .then(() => fetchRoutes())
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>
          <Settings size={24} style={{ marginRight: '10px', color: '#475569', verticalAlign: 'middle' }} />
          Sistem Ayarları ve Yönetim
        </h2>
      </div>

      <div className="settings-grid">
        {/* ARAÇ YÖNETİMİ PANELİ */}
        <div className="settings-card">
          <h3>
            <Truck size={20} color="#3b82f6" />
            Araç Filosu Yönetimi
          </h3>

          <form onSubmit={handleVehicleSubmit} className="form-row" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="input-group">
              <label>Plaka Numarası:</label>
              <input 
                type="text" 
                placeholder="Örn: 34 ABC 123" 
                value={vehicleForm.plate_number} 
                onChange={e => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Kapasite (KG):</label>
              <input 
                type="number" 
                placeholder="Örn: 3500" 
                value={vehicleForm.capacity_kg} 
                onChange={e => setVehicleForm({ ...vehicleForm, capacity_kg: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loadingVehicles}>
              {loadingVehicles ? 'Kaydediliyor...' : 'Yeni Araç Ekle'}
            </button>
          </form>

          <h4>Kayıtlı Araçlar ({vehicles.length})</h4>
          <div className="list-section">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plaka</th>
                  <th>Kapasite (KG)</th>
                  <th>Durum</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.plate_number}</strong></td>
                    <td>{v.capacity_kg} kg</td>
                    <td>
                      <span className="badge success">Aktif</span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteVehicle(v.id, v.plate_number)}
                        style={{padding: '4px 10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#dc2626', fontSize: '12px'}}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center">Kayıtlı araç bulunmamaktadır.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROTA YÖNETİMİ PANELİ */}
        <div className="settings-card">
          <h3>
            <Navigation size={20} color="#10b981" />
            Taşıma Rotaları Yönetimi
          </h3>

          <form onSubmit={handleRouteSubmit} className="form-row" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="input-group">
                <label>Başlangıç Noktası:</label>
                <input 
                  type="text" 
                  placeholder="Örn: İstanbul" 
                  value={routeForm.start_point} 
                  onChange={e => setRouteForm({ ...routeForm, start_point: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Bitiş Noktası:</label>
                <input 
                  type="text" 
                  placeholder="Örn: İzmir" 
                  value={routeForm.end_point} 
                  onChange={e => setRouteForm({ ...routeForm, end_point: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="input-group">
                <label>Mesafe (KM):</label>
                <input 
                  type="number" 
                  placeholder="Örn: 480" 
                  value={routeForm.distance_km} 
                  onChange={e => setRouteForm({ ...routeForm, distance_km: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Tahmini Süre (Saat):</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="Örn: 5.5" 
                  value={routeForm.estimated_hours} 
                  onChange={e => setRouteForm({ ...routeForm, estimated_hours: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="submit-btn" style={{ backgroundColor: '#10b981' }} disabled={loadingRoutes}>
              {loadingRoutes ? 'Kaydediliyor...' : 'Yeni Rota Ekle'}
            </button>
          </form>

          <h4>Aktif Rotalar ({routes.length})</h4>
          <div className="list-section">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rota</th>
                  <th>Mesafe</th>
                  <th>Süre</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.start_point} ➤ {r.end_point}</strong></td>
                    <td>{r.distance_km} km</td>
                    <td>{r.estimated_hours} saat</td>
                    <td>
                      <button
                        onClick={() => handleDeleteRoute(r.id, `${r.start_point} - ${r.end_point}`)}
                        style={{padding: '4px 10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#dc2626', fontSize: '12px'}}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {routes.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center">Kayıtlı rota bulunmamaktadır.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
