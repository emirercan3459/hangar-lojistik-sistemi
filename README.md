# Hangar Lojistik Yönetim Sistemi

Hangar ortamlarındaki lojistik operasyonları yönetmek için geliştirilmiş tam yığın (full-stack) web uygulaması.

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| **Backend API** | Python · FastAPI · SQLAlchemy |
| **Veritabanı** | PostgreSQL |
| **Frontend** | React · Axios |
| **Harici API** | Open-Meteo (Hava Durumu) |

## Özellikler

- 📦 **Ürün & Stok Yönetimi** — Ürün ekleme/silme, raf bazlı stok giriş/çıkış işlemleri
- 🚚 **Sevkiyat Takibi** — Sevkiyat oluşturma, durum güncelleme, takip kodu otomatik üretimi
- 🌤️ **Canlı Hava Durumu** — Sevkiyat varış noktası için Open-Meteo API entegrasyonu
- 📋 **Durum Geçmişi** — Sevkiyat durumu değişimlerinin PostgreSQL trigger ile otomatik loglanması
- ⚠️ **Kritik Stok Uyarıları** — Stok eşik altına düşünce otomatik uyarı (trigger tetikli)
- 👥 **Personel Yönetimi** — Personel ekleme/silme/rol yönetimi
- 🏭 **Araç & Rota Yönetimi** — Araç filosu ve taşıma rotaları yönetimi
- 📊 **Sistem Logları** — Tüm aksiyonların audit trail kaydı
- 📱 **Barkod Görüntüleme** — Ürün SKU'larına ait barkod gösterimi

## Veritabanı Yapısı

**11 ilişkili tablo**, 2 PostgreSQL trigger, 4 index:

- `logistics_product` — Ürünler
- `logistics_stocktransaction` — Stok işlemleri *(trigger: total_stock otomatik güncellenir)*
- `logistics_stockalert` — Kritik stok uyarıları *(trigger: eşik altında otomatik uyarı)*
- `logistics_shipment` — Sevkiyatlar
- `logistics_shipmentlog` — Sevkiyat durum geçmişi *(trigger: durum değişiminde otomatik log)*
- `logistics_personnel` — Personel
- `logistics_vehicle` — Araçlar
- `logistics_route` — Rotalar
- `logistics_shelf` — Raflar
- `logistics_hangarregion` — Hangar bölgeleri
- `logistics_systemactionlog` — Sistem audit log

> SQL şeması ve trigger tanımları için: `hangar_lojistik_veritabani.sql`

## Kurulum

### Gereksinimler
- Python 3.10+
- Node.js 16+
- PostgreSQL 14+

### 1. Veritabanı Oluştur
```sql
CREATE DATABASE hangar_db;
```

### 2. Backend Kurulumu
```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install fastapi uvicorn sqlalchemy psycopg2-binary requests pydantic
```

### 3. Frontend Kurulumu
```bash
cd frontend
npm install
```

### 4. Başlatma

**Windows (tek tıkla):**
```
baslat.bat dosyasına çift tıkla
```

**Manuel:**
```bash
# Terminal 1 — Backend
venv\Scripts\activate
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend
cd frontend
npm start
```

## Çalışma Adresleri

| Servis | Adres |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| API Dokümantasyonu | http://127.0.0.1:8000/docs |

## API Endpoint'leri

| Method | Endpoint | Açıklama |
|---|---|---|
| GET/POST | `/api/products` | Ürün listele/ekle |
| PUT/DELETE | `/api/products/{id}` | Ürün güncelle/sil |
| POST | `/api/stock/transaction` | Stok giriş/çıkış |
| GET/POST | `/api/shipments` | Sevkiyat listele/ekle |
| PUT/DELETE | `/api/shipments/{id}` | Sevkiyat güncelle/sil |
| PUT | `/api/shipments/{id}/status` | Durum güncelle |
| GET | `/api/shipments/{id}/weather` | Hava durumu |
| GET | `/api/shipments/{id}/logs` | Durum geçmişi |
| GET/POST/DELETE | `/api/personnel` | Personel yönetimi |
| GET/POST/DELETE | `/api/vehicles` | Araç yönetimi |
| GET/POST/DELETE | `/api/routes` | Rota yönetimi |
| GET | `/api/alerts` | Kritik stok uyarıları |
| POST | `/api/alerts/{id}/resolve` | Uyarı çöz |
| GET | `/api/shelves` | Raf listesi |
| GET | `/api/logs` | Sistem logları |
| GET | `/api/dashboard/stats` | Dashboard istatistikleri |
| POST | `/api/seed` | Başlangıç verisi ekle |
