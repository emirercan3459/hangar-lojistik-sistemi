import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity } from 'lucide-react';
import './Products.css'; // Aynı tablo stillerini kullanalım

const API_URL = 'http://localhost:8000/api';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    axios.get(`${API_URL}/logs`)
      .then(res => setLogs(res.data))
      .catch(err => alert('Loglar alınamadı: ' + err.message))
      .finally(() => setLoading(false));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>
          <Activity size={24} style={{ marginRight: '10px', color: '#3b82f6', verticalAlign: 'middle' }} />
          Sistem Denetim İzi (Audit Trail)
        </h2>
        <button className="primary-btn" onClick={fetchLogs}>🔄 Listeyi Yenile</button>
      </div>

      <div className="content-section" style={{ backgroundColor: '#1e293b', border: 'none' }}>
        <p style={{ color: '#94a3b8', marginBottom: '15px' }}>
          Sistem üzerinde yapılan tüm kritik ekleme, silme ve güncelleme işlemleri yasal uyumluluk gereği zaman damgalı olarak bu sayfada listelenmektedir.
        </p>
        
        {loading ? <p style={{ color: '#fff' }}>Yükleniyor...</p> : (
          <table className="data-table" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#1e293b', color: '#cbd5e1' }}>Tarih / Saat</th>
                <th style={{ backgroundColor: '#1e293b', color: '#cbd5e1' }}>Aksiyon Tipi</th>
                <th style={{ backgroundColor: '#1e293b', color: '#cbd5e1' }}>Kullanıcı (Aktör)</th>
                <th style={{ backgroundColor: '#1e293b', color: '#cbd5e1' }}>Açıklama / Detay</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ color: '#94a3b8', fontSize: '13px' }}>{formatDate(log.created_at)}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      backgroundColor: log.action_type.includes('GİRİŞ') || log.action_type.includes('EKLENDİ') ? '#065f46' : 
                                       log.action_type.includes('ÇIKIŞI') ? '#991b1b' : '#1e40af',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>@{log.actor}</span>
                  </td>
                  <td style={{ color: '#e2e8f0' }}>{log.description}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" className="text-center" style={{ color: '#64748b' }}>Sistemde henüz kayıtlı bir log bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Logs;