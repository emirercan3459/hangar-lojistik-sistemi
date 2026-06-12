# Proje Adı
Hangar Lojistik Yönetim Sistemi

# Proje Amacı
Hangar ortamlarındaki lojistik operasyonları, ürün stok süreçlerini, sevkiyat takiplerini ve personel yönetimini merkezi bir noktadan verimli bir şekilde yürütmek için geliştirilmiş tam yığın (full-stack) web uygulamasıdır.

# Kullanılan Teknolojiler
- Backend: Python, FastAPI, SQLAlchemy
- Veritabanı: PostgreSQL
- Frontend: React, Axios
- Harici API: Open-Meteo (Hava Durumu entegrasyonu için)

# Kurulum Adımları
Sistemi yerel ortamınızda çalıştırmak için aşağıdaki adımları sırasıyla uygulayabilirsiniz.

1. Veritabanı Oluşturma
Sistem PostgreSQL veritabanı kullanmaktadır. Öncelikle veritabanını oluşturun:
```sql
CREATE DATABASE hangar_db;
```

2. Backend Gereksinimlerinin Yüklenmesi
Sanal ortam oluşturarak gerekli Python paketlerini kurun:
```bash
python -m venv venv
venv\Scripts\activate          # Windows için
# source venv/bin/activate     # Linux/Mac için
pip install fastapi uvicorn sqlalchemy psycopg2-binary requests pydantic
```

3. Çevre Değişkenleri (.env) Oluşturma
Backend konfigürasyonlarını sağlayabilmek için proje dizininde bir `.env` dosyası oluşturun. Dosya içerisine veritabanı bağlantı cümlenizi ve gerekliyse diğer sabitleri aşağıdaki formata uygun şekilde ekleyin:
```env
DATABASE_URL=postgresql://kullanici_adiniz:sifreniz@localhost:5432/hangar_db
```

# API Endpointleri
| Method | Endpoint | Açıklama |
|---|---|---|
| GET/POST | `/api/products` | Ürün listeleme ve ekleme işlemleri |
| PUT/DELETE | `/api/products/{id}` | Ürün güncelleme ve silme işlemleri |
| POST | `/api/stock/transaction` | Stok giriş ve çıkış işlemleri |
| GET/POST | `/api/shipments` | Sevkiyat listeleme ve ekleme işlemleri |
| PUT/DELETE | `/api/shipments/{id}` | Sevkiyat güncelleme ve silme işlemleri |
| PUT | `/api/shipments/{id}/status` | Sevkiyat durumunu güncelleme |
| GET | `/api/shipments/{id}/weather` | Sevkiyata ait varış noktası hava durumu verisi |
| GET | `/api/shipments/{id}/logs` | Sevkiyat durum geçmişi kayıtları |
| GET/POST/DELETE | `/api/personnel` | Personel yönetimi işlemleri |
| GET/POST/DELETE | `/api/vehicles` | Araç filosu yönetimi işlemleri |
| GET/POST/DELETE | `/api/routes` | Rota yönetimi işlemleri |
| GET | `/api/alerts` | Kritik stok uyarısı listesi |
| POST | `/api/alerts/{id}/resolve` | Belirli bir stok uyarısını çözüldü olarak işaretleme |
| GET | `/api/shelves` | Sistemde kayıtlı raf listesi |
| GET | `/api/logs` | Sistem tarafından oluşturulan denetim (audit) logları |
| GET | `/api/dashboard/stats` | Dashboard için genel istatistik verileri |
| POST | `/api/seed` | Test amaçlı başlangıç verilerinin sisteme eklenmesi |

# Veritabanı Yapısı
Sistemde 11 adet ilişkili tablo, 2 adet PostgreSQL trigger yapısı ve 4 index bulunmaktadır. Detaylı SQL şeması proje içindeki `hangar_lojistik_veritabani.sql` dosyasında yer almaktadır.

Tablo Listesi:
- logistics_product: Ürünlerin temel bilgilerini tutar.
- logistics_stocktransaction: Stok giriş/çıkış kayıtlarını tutar. (Trigger: İşlem sonrası ürünün total_stock değerini otomatik günceller)
- logistics_stockalert: Kritik stok uyarılarını saklar. (Trigger: Stok eşik değerinin altına düştüğünde otomatik uyarı oluşturur)
- logistics_shipment: Sevkiyat ve kargo kayıtlarını tutar.
- logistics_shipmentlog: Sevkiyatların durum değişikliklerini geçmişe yönelik kaydeder. (Trigger: Durum değişiminde otomatik log yazar)
- logistics_personnel: Sistemde yetkili personellerin kayıtlarını tutar.
- logistics_vehicle: Lojistik operasyonlarında kullanılan araçların bilgilerini tutar.
- logistics_route: Sevkiyatlar için tanımlı rotaların kayıtlarını tutar.
- logistics_shelf: Depo içerisindeki raf ve bölümlerin kayıtlarını tutar.
- logistics_hangarregion: Hangar içi genel bölge tanımlarını tutar.
- logistics_systemactionlog: Sistem üzerindeki kritik eylemlerin iz kayıtlarını (audit log) tutar.

# Ekran Görüntüleri

![Ekran Görüntüsü 1](docs/images/Screenshot_20260612_032248.png)
![Ekran Görüntüsü 2](docs/images/Screenshot_20260612_032300.png)
![Ekran Görüntüsü 3](docs/images/Screenshot_20260612_032306.png)
![Ekran Görüntüsü 4](docs/images/Screenshot_20260612_032319.png)

# Kullanım Örnekleri
- Yeni Ürün Kaydı: Sistem üzerinden barkod numarası, ad, kategori ve kritik stok eşiği belirtilerek yeni bir ürün eklenebilir. Ürün eklendikten sonra belirli bir rafa atanabilir.
- Stok Hareketi: Depoya giren veya depodan çıkan ürünler için stok hareketi oluşturulur. Bu işlem, ilgili ürünün toplam stok miktarını sistemde otomatik olarak günceller.
- Sevkiyat Başlatma: Mevcut bir sipariş için araç ve rota seçimi yapılarak yeni bir sevkiyat başlatılabilir. Sistem bu aşamada benzersiz bir kargo takip numarası üretir.
- Hava Durumu Kontrolü: Devam eden bir sevkiyatın varış noktası için sistem üzerinden canlı hava durumu bilgisi çekilerek olası gecikmeler önceden değerlendirilebilir.
