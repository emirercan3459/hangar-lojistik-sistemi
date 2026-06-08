import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Products.css'; // Aynı stil sınıflarını kullanacağız

const API_URL = 'http://localhost:8000/api';

const Personnel = () => {
  const [personnel, setPersonnel] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', role: 'WORKER' });

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = () => {
    axios.get(`${API_URL}/personnel`).then(res => setPersonnel(res.data));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(`${API_URL}/personnel`, formData)
      .then(() => {
        fetchPersonnel();
        setShowForm(false);
        setFormData({ first_name: '', last_name: '', role: 'WORKER' });
      })
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  const handleDelete = (personId, name) => {
    if (!window.confirm(`"${name}" silinecek. Emin misiniz?`)) return;
    axios.delete(`${API_URL}/personnel/${personId}`)
      .then(() => fetchPersonnel())
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  const getRoleBadge = (role) => {
    if (role === 'MANAGER') return <span className="badge" style={{backgroundColor: '#fef3c7', color: '#b45309'}}>Yönetici</span>;
    if (role === 'DRIVER') return <span className="badge" style={{backgroundColor: '#e0e7ff', color: '#1d4ed8'}}>Sürücü</span>;
    return <span className="badge" style={{backgroundColor: '#f1f5f9', color: '#475569'}}>Personel</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Personel ve Yetki Yönetimi</h2>
        <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Vazgeç' : '+ Yeni Personel Ekle'}
        </button>
      </div>

      {showForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <h3>Yeni Personel Kaydı</h3>
          <div className="form-group">
            <label>Adı:</label>
            <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Soyadı:</label>
            <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Yetki (Rol):</label>
            <select 
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
              style={{ width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="WORKER">Meydan Personeli</option>
              <option value="DRIVER">Araç Sürücüsü</option>
              <option value="MANAGER">Yönetici (Manager)</option>
            </select>
          </div>
          <button type="submit" className="success-btn">Kaydet</button>
        </form>
      )}

      <div className="content-section">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Adı</th>
              <th>Soyadı</th>
              <th>Rol (Yetki)</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.first_name}</td>
                <td>{p.last_name}</td>
                <td>{getRoleBadge(p.role)}</td>
                <td>
                  <button
                    onClick={() => handleDelete(p.id, `${p.first_name} ${p.last_name}`)}
                    style={{padding: '5px 12px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#dc2626'}}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {personnel.length === 0 && (
              <tr><td colSpan="5" className="text-center">Sistemde kayıtlı personel bulunmamaktadır.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Personnel;