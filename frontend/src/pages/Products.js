import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import { ScanBarcode, Download } from 'lucide-react';
import './Products.css';

const API_URL = 'http://localhost:8000/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', sku: '', critical_stock_level: 10, description: '' });

  // Stok İşlemi (IN/OUT) modal state'i
  const [transactionModal, setTransactionModal] = useState({ visible: false, productId: null, productName: '', type: 'IN', quantity: 0, personnel_id: '', shelf_id: '' });
  
  // Barkod Görüntüleme Modal state'i
  const [barcodeModal, setBarcodeModal] = useState({ visible: false, sku: '', name: '' });

  const [shelves, setShelves] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);

  useEffect(() => {
    fetchProducts();
    axios.get(`${API_URL}/shelves`).then(res => setShelves(res.data)).catch(err => console.error(err));
    axios.get(`${API_URL}/personnel`).then(res => setPersonnelList(res.data)).catch(err => console.error(err));
  }, []);

  const fetchProducts = () => {
    axios.get(`${API_URL}/products`).then(res => setProducts(res.data));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(`${API_URL}/products`, formData)
      .then(() => {
        fetchProducts();
        setShowForm(false);
        setFormData({ name: '', sku: '', critical_stock_level: 10, description: '' });
      })
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  const handleTransaction = (e) => {
    e.preventDefault();
    if(transactionModal.quantity <= 0) return alert("Miktar sıfırdan büyük olmalıdır!");
    
    const payload = {
      product_id: transactionModal.productId,
      transaction_type: transactionModal.type,
      quantity: transactionModal.quantity
    };
    if (transactionModal.personnel_id) {
      payload.personnel_id = parseInt(transactionModal.personnel_id);
    }
    if (transactionModal.shelf_id) {
      payload.shelf_id = parseInt(transactionModal.shelf_id);
    }

    axios.post(`${API_URL}/stock/transaction`, payload).then(() => {
      fetchProducts(); // Tabloyu tazele
      setTransactionModal({ visible: false, productId: null, productName: '', type: 'IN', quantity: 0, personnel_id: '', shelf_id: '' });
    }).catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  const handleDelete = (productId, productName) => {
    if (!window.confirm(`"${productName}" ürünü silinecek. Emin misiniz?`)) return;
    axios.delete(`${API_URL}/products/${productId}`)
      .then(() => fetchProducts())
      .catch(err => alert('Hata: ' + (err.response?.data?.detail || err.message)));
  };

  // Excel (CSV) İndirme Fonksiyonu
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,SKU,Urun Adi,Mevcut Stok,Kritik Seviye\n";
    products.forEach(p => {
      csvContent += `${p.id},${p.sku},${p.name},${p.total_stock},${p.critical_stock_level}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hangar_envanter_raporu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Ürün ve Depo Envanteri</h2>
        <div>
          <button className="success-btn" onClick={exportToCSV}>
            <Download size={16} style={{marginRight: '6px'}} /> Excel (CSV) İndir
          </button>
          <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Vazgeç' : '+ Yeni Ürün Tanımla'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <h3>Yeni Ürün Kayıt Kartı</h3>
          <div className="form-group">
            <label>Ürün Kısa Adı:</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Benzersiz SKU (Stok Kodu):</label>
            <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Sistem Uyarı Eşiği (Kritik Stok):</label>
            <input type="number" value={formData.critical_stock_level} onChange={e => setFormData({...formData, critical_stock_level: e.target.value})} />
          </div>
          <button type="submit" className="success-btn">Veritabanına Kaydet</button>
        </form>
      )}

      {/* Stok Giriş/Çıkış Hızlı Aksiyon Modalı - Satıriçi */}
      {transactionModal.visible && (
        <div className="add-form" style={{backgroundColor: '#eff6ff', border: '1px solid #bfdbfe'}}>
          <h3 style={{color: '#1e3a8a'}}>Hızlı Stok Aksiyonu - {transactionModal.productName}</h3>
          <form onSubmit={handleTransaction}>
            <div className="form-group">
              <label>İşlem Tipi:</label>
              <select value={transactionModal.type} onChange={e => setTransactionModal({...transactionModal, type: e.target.value})} style={{ width: '150px', padding: '8px', borderRadius: '4px' }}>
                <option value="IN">Giriş (Depoya Ekle)</option>
                <option value="OUT">Çıkış (Depodan Düş)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Miktar (Adet):</label>
              <input required type="number" value={transactionModal.quantity} onChange={e => setTransactionModal({...transactionModal, quantity: parseInt(e.target.value) || 0})} />
            </div>
            <div className="form-group">
              <label>İşlemi Yapan Personel:</label>
              <select value={transactionModal.personnel_id} onChange={e => setTransactionModal({...transactionModal, personnel_id: e.target.value})} style={{ width: '180px', padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Personel Seçiniz (Opsiyonel) --</option>
                {personnelList.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.role})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Hedef Raf:</label>
              <select value={transactionModal.shelf_id} onChange={e => setTransactionModal({...transactionModal, shelf_id: e.target.value})} style={{ width: '180px', padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Raf Seçiniz (Opsiyonel) --</option>
                {shelves.map(s => (
                  <option key={s.id} value={s.id}>{s.shelf_code}</option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button type="submit" className="primary-btn" style={{backgroundColor: '#2563eb'}}>İşlemi Onayla</button>
              <button type="button" className="primary-btn" style={{backgroundColor: '#94a3b8', marginLeft: '10px'}} onClick={() => setTransactionModal({...transactionModal, visible: false})}>İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* BARKOD GÖRÜNTÜLEME MODALI */}
      {barcodeModal.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3>{barcodeModal.name}</h3>
            <p style={{color: '#64748b', fontSize: '12px', marginBottom: '20px'}}>Barkodu yazdırmak için sağ tıklayıp resmi kaydedebilirsiniz.</p>
            <div style={{ backgroundColor: '#fff', padding: '20px', display: 'inline-block' }}>
              <Barcode value={barcodeModal.sku} width={2} height={80} displayValue={true} />
            </div>
            <br />
            <button className="primary-btn" style={{marginTop: '20px', width: '100%'}} onClick={() => setBarcodeModal({visible: false, sku: '', name: ''})}>Kapat</button>
          </div>
        </div>
      )}

      <div className="content-section">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Ürün Adı / Açıklama</th>
              <th>Toplam Stok</th>
              <th>Kritik Eşik</th>
              <th>Durum</th>
              <th>Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td><span className="badge" style={{backgroundColor: '#f1f5f9', color: '#475569'}}>{p.sku}</span></td>
                <td>{p.name}</td>
                <td><strong style={{fontSize: '18px', color: p.total_stock <= p.critical_stock_level ? '#dc2626' : '#16a34a'}}>{p.total_stock}</strong></td>
                <td>{p.critical_stock_level}</td>
                <td>
                  {p.total_stock <= p.critical_stock_level ? (
                    <span className="badge danger">Dikkat! Stok Azaldı</span>
                  ) : <span className="badge success">Sorun Yok</span>}
                </td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <button 
                      onClick={() => setBarcodeModal({ visible: true, sku: p.sku, name: p.name })}
                      style={{height: '30px', padding: '0 10px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', whiteSpace: 'nowrap'}}
                    >
                      <ScanBarcode size={14}/>
                      Barkod
                    </button>
                    <button 
                      onClick={() => setTransactionModal({ visible: true, productId: p.id, productName: p.name, type: 'IN', quantity: 1, personnel_id: '', shelf_id: '' })}
                      style={{height: '30px', padding: '0 10px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', color: '#334155', display: 'inline-flex', alignItems: 'center', fontSize: '13px', whiteSpace: 'nowrap'}}
                    >
                      Stok İşlemi
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id, p.name)}
                      style={{height: '30px', padding: '0 10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', color: '#dc2626', display: 'inline-flex', alignItems: 'center', fontSize: '13px', whiteSpace: 'nowrap'}}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan="6" className="text-center">Henüz deponuzda kayıtlı ürün yok. Lütfen envanter tanımlaması yapın.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;