import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CloudSun, History } from 'lucide-react';
import './Products.css';

const API_URL = 'http://localhost:8000/api';

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ weight_kg: 0, route_id: '', vehicle_id: '', status: 'PENDING' });

  // Yeni özelliklerin state'leri
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedShipmentLogs, setSelectedShipmentLogs] = useState([]);
  const [selectedShipmentNo, setSelectedShipmentNo] = useState('');

  useEffect(() => {
    fetchShipments();
    fetchMetadata();
  }, []);

  const fetchShipments = () => {
    axios.get(`${API_URL}/shipments`).then(res => setShipments(res.data)).catch(() => {});
  };

  const fetchMetadata = () => {
    axios.get(`${API_URL}/routes`).then(res => setRoutes(res.data));
    axios.get(`${API_URL}/vehicles`).then(res => setVehicles(res.data));
  };

  const handleFetchWeather = (shipmentId) => {
    setWeatherInfo({ loading: true });
    axios.get(`${API_URL}/shipments/${shipmentId}/weather`)
      .then(res => setWeatherInfo({ loading: false, data: res.data }))
      .catch(err => setWeatherInfo({ loading: false, error: err.response?.data?.detail || err.message }));
  };

  const handleFetchLogs = (shipment) => {
    setSelectedShipmentNo(shipment.tracking_number);
    axios.get(`${API_URL}/shipments/${shipment.id}/logs`)
      .then(res => {
        setSelectedShipmentLogs(res.data);
        setShowLogsModal(true);
      })
      .catch(err => alert("Durum geçmişi yüklenemedi: " + err.message));
  };

  const handleStatusChange = (shipmentId, newStatus) => {
    axios.put(`${API_URL}/shipments/${shipmentId}/status`, { status: newStatus })
      .then(() => {
        fetchShipments();
      })
      .catch(err => alert("Durum güncellenemedi: " + err.message));
  };

  const handleDeleteShipment = (shipmentId, trackingNo) => {
    if (!window.confirm(`"${trackingNo}" sevkiyatı silinecek. Emin misiniz?`)) return;
    axios.delete(`${API_URL}/shipments/${shipmentId}`)
      .then(() => fetchShipments())
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(`${API_URL}/shipments`, formData)
      .then(() => {
        fetchShipments();
        setShowForm(false);
        setFormData({ weight_kg: 0, route_id: '', vehicle_id: '', status: 'PENDING' }); // Formu Sıfırla
      })
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };


  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Aktif Sevkiyatlar Özeti</h2>
        <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Kapat' : '+ Yeni Gönderi Planla'}
        </button>
      </div>

      {showForm && (
        <form className="add-form" onClick={(e)=> e.stopPropagation()} onSubmit={handleSubmit}>
          <h3>Sevkiyat Rotası ve Detayları</h3>
          <p style={{fontSize:'12px', color:'#64748b', marginBottom:'15px'}}>*(Kargo Takip / İrsaliye numarası sistem tarafından otomatik oluşturulacaktır.)</p>
          
          <div className="form-group">
            <label>Toplam Ağırlık (KG):</label>
            <input required type="number" step="0.1" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: parseFloat(e.target.value)})} />
          </div>

          <div className="form-group">
            <label>Aktif Çalışan Rotalarımız:</label>
            <select required value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} style={{ width: '220px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Rota Seçiniz --</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.start_point} ➔ {r.end_point} (Tahmini: {r.estimated_hours} Saat)</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Teslimata Çıkacak Araç:</label>
            <select value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} style={{ width: '220px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Araç Atama (Opsiyonel) --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number} (Mak: {v.capacity_kg} kg)</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Şu Anki Durumu:</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <option value="PENDING">Depoda Bekliyor</option>
              <option value="IN_TRANSIT">Sevkiyatta / Yolda</option>
              <option value="DELIVERED">Teslim İşlemi Bitti</option>
            </select>
          </div>
          
          <div style={{marginTop: '15px'}}>
            <button type="submit" className="success-btn" style={{width: '100%'}}>Sisteme İşle</button>
          </div>
        </form>
      )}

      <div className="content-section">
        <table className="data-table">
          <thead>
            <tr>
              <th>İrsaliye / Takip</th>
              <th>Ağırlık</th>
              <th>Rota Bilgisi</th>
              <th>Nakliye Aracı</th>
              <th>Durum</th>
              <th>Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map(s => {
              const routeInfo = routes.find(r => r.id === s.route_id);
              const vehicleInfo = vehicles.find(v => v.id === s.vehicle_id);
              return (
                <tr key={s.id}>
                  <td><strong>{s.tracking_number}</strong></td>
                  <td>{s.weight_kg} kg</td>
                  <td>{routeInfo ? `${routeInfo.start_point} ➔ ${routeInfo.end_point}` : 'Bilinmeyen'}</td>
                  <td>{vehicleInfo ? <span className="badge" style={{backgroundColor: '#f3f4f6', color: '#334155'}}>{vehicleInfo.plate_number}</span> : <span className="badge" style={{backgroundColor: '#fee2e2', color: '#b91c1c'}}>Atanmadı</span>}</td>
                  <td>
                    <select 
                      value={s.status} 
                      onChange={(e) => handleStatusChange(s.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '500', outline: 'none' }}
                    >
                      <option value="PENDING">Depoda Bekliyor</option>
                      <option value="IN_TRANSIT">Sevkiyatta / Yolda</option>
                      <option value="DELIVERED">Teslim Edildi</option>
                      <option value="CANCELLED">İptal Edildi</option>
                    </select>
                  </td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <button 
                        onClick={() => handleFetchWeather(s.id)}
                        style={{ width: '30px', height: '30px', padding: '0', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', color: '#0369a1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Canlı Hava Durumu"
                      >
                        <CloudSun size={15} />
                      </button>
                      <button 
                        onClick={() => handleFetchLogs(s)}
                        style={{ width: '30px', height: '30px', padding: '0', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Durum Geçmişi"
                      >
                        <History size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeleteShipment(s.id, s.tracking_number)}
                        style={{ width: '30px', height: '30px', padding: '0', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }}
                        title="Sevkiyatı Sil"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {shipments.length === 0 && (
              <tr><td colSpan="6" className="text-center">Sistemde gönderimi bekleyen sevkiyat bulunmamaktadır.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CANLI HAVA DURUMU MODALI */}
      {weatherInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0369a1' }}>
              <CloudSun size={24} />
              Varış Noktası Hava Durumu
            </h3>
            {weatherInfo.loading && <p>Yükleniyor...</p>}
            {weatherInfo.error && <p style={{ color: '#dc2626' }}>Hata: {weatherInfo.error}</p>}
            {weatherInfo.data && (
              <div style={{ margin: '20px 0' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>Takip No: <strong>{weatherInfo.data.tracking_number}</strong></p>
                <h2 style={{ fontSize: '36px', margin: '10px 0', color: '#0f172a' }}>{weatherInfo.data.temperature}°C</h2>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155' }}>📍 {weatherInfo.data.destination}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', textAlign: 'left', fontSize: '14px' }}>
                  <div><strong>💨 Rüzgar Hızı:</strong> {weatherInfo.data.windspeed} km/s</div>
                  <div><strong>📊 Hava Durumu:</strong> Güncel Canlı Veri</div>
                </div>
              </div>
            )}
            <button className="primary-btn" style={{ width: '100%', marginTop: '10px', backgroundColor: '#0284c7' }} onClick={() => setWeatherInfo(null)}>Kapat</button>
          </div>
        </div>
      )}

      {/* SEVKİYAT DURUM GEÇMİŞİ MODALI */}
      {showLogsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} />
                Durum Geçmişi ({selectedShipmentNo})
              </h3>
              <button 
                onClick={() => setShowLogsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', borderLeft: '2px solid #e2e8f0', paddingLeft: '20px', marginLeft: '10px' }}>
                {selectedShipmentLogs.map((log, index) => (
                  <div key={log.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-27px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: index === 0 ? '#3b82f6' : '#94a3b8', border: '2px solid #fff' }}></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(log.changed_at).toLocaleString('tr-TR')}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '3px' }}>
                      Durum: <span style={{ color: '#d97706' }}>{log.old_status}</span> ➔ <span style={{ color: '#16a34a' }}>{log.new_status}</span>
                    </div>
                  </div>
                ))}
                {selectedShipmentLogs.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginLeft: '-20px' }}>Henüz bu sevkiyat için durum değişimi gerçekleşmemiş.</p>
                )}
              </div>
            </div>
            <button className="primary-btn" style={{ width: '100%', marginTop: '20px', backgroundColor: '#64748b' }} onClick={() => setShowLogsModal(false)}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;