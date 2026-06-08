-- =================================================================
-- HANGAR LOJİSTİK YÖNETİM SİSTEMİ
-- Veritabanı Şeması, Trigger Fonksiyonları ve Index Tanımlamaları
-- Veritabanı: PostgreSQL 14+
-- =================================================================


-- =================================================================
-- BÖLÜM 1: TABLO OLUŞTURMA (CREATE TABLE)
-- =================================================================

-- 1.1 Ürün Tablosu
CREATE TABLE IF NOT EXISTS logistics_product (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(200)    NOT NULL,
    sku                 VARCHAR(50)     NOT NULL UNIQUE,
    description         TEXT,
    total_stock         INTEGER         NOT NULL DEFAULT 0,
    critical_stock_level INTEGER        NOT NULL DEFAULT 10
);

-- 1.2 Hangar Bölge Tablosu
CREATE TABLE IF NOT EXISTS logistics_hangarregion (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    description TEXT
);

-- 1.3 Raf Tablosu
CREATE TABLE IF NOT EXISTS logistics_shelf (
    id          SERIAL PRIMARY KEY,
    shelf_code  VARCHAR(50)     NOT NULL UNIQUE,
    region_id   INTEGER         NOT NULL
        REFERENCES logistics_hangarregion(id) ON DELETE CASCADE
);

-- 1.4 Personel Tablosu
CREATE TABLE IF NOT EXISTS logistics_personnel (
    id          SERIAL PRIMARY KEY,
    first_name  VARCHAR(100)    NOT NULL,
    last_name   VARCHAR(100)    NOT NULL,
    role        VARCHAR(50)     NOT NULL  -- 'MANAGER', 'WORKER', 'DRIVER'
);

-- 1.5 Stok İşlem Tablosu
CREATE TABLE IF NOT EXISTS logistics_stocktransaction (
    id                  BIGSERIAL PRIMARY KEY,
    transaction_type    VARCHAR(3)              NOT NULL,  -- 'IN' veya 'OUT'
    quantity            INTEGER                 NOT NULL,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    product_id          BIGINT                  NOT NULL
        REFERENCES logistics_product(id) ON DELETE CASCADE,
    personnel_id        BIGINT
        REFERENCES logistics_personnel(id) ON DELETE SET NULL,
    shelf_id            BIGINT
        REFERENCES logistics_shelf(id) ON DELETE SET NULL
);

-- 1.6 Kritik Stok Uyarı Tablosu
CREATE TABLE IF NOT EXISTS logistics_stockalert (
    id          BIGSERIAL PRIMARY KEY,
    message     VARCHAR(255)    NOT NULL,
    resolved    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    product_id  BIGINT          NOT NULL
        REFERENCES logistics_product(id) ON DELETE CASCADE
);

-- 1.7 Araç Tablosu
CREATE TABLE IF NOT EXISTS logistics_vehicle (
    id              SERIAL PRIMARY KEY,
    plate_number    VARCHAR(20)     NOT NULL UNIQUE,
    capacity_kg     NUMERIC(10, 2)  NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE
);

-- 1.8 Rota Tablosu
CREATE TABLE IF NOT EXISTS logistics_route (
    id              SERIAL PRIMARY KEY,
    start_point     VARCHAR(255)    NOT NULL,
    end_point       VARCHAR(255)    NOT NULL,
    distance_km     NUMERIC(8, 2)   NOT NULL,
    estimated_hours NUMERIC(5, 2)   NOT NULL
);

-- 1.9 Sevkiyat Tablosu
CREATE TABLE IF NOT EXISTS logistics_shipment (
    id              BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(100)    NOT NULL UNIQUE,
    weight_kg       NUMERIC(10, 2)  NOT NULL,
    status          VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    product_id      BIGINT
        REFERENCES logistics_product(id) ON DELETE SET NULL,
    route_id        BIGINT          NOT NULL
        REFERENCES logistics_route(id) ON DELETE CASCADE,
    vehicle_id      BIGINT
        REFERENCES logistics_vehicle(id) ON DELETE SET NULL,
    driver_id       BIGINT
        REFERENCES logistics_personnel(id) ON DELETE SET NULL
);

-- 1.10 Sevkiyat Durum Değişim Logu Tablosu
CREATE TABLE IF NOT EXISTS logistics_shipmentlog (
    id          BIGSERIAL PRIMARY KEY,
    shipment_id INTEGER         NOT NULL,
    old_status  VARCHAR(50)     NOT NULL,
    new_status  VARCHAR(50)     NOT NULL,
    changed_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 1.11 Sistem Aksiyon Logu Tablosu (Audit Trail)
CREATE TABLE IF NOT EXISTS logistics_systemactionlog (
    id          SERIAL PRIMARY KEY,
    action_type VARCHAR(100)    NOT NULL,
    description TEXT            NOT NULL,
    actor       VARCHAR(100)    NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ     DEFAULT NOW()
);


-- =================================================================
-- BÖLÜM 2: INDEX TANIMLARI
-- =================================================================

-- Stok işlemlerini tip ve tarihe göre hızlı filtrelemek için
CREATE INDEX IF NOT EXISTS idx_stocktransaction_type_date
    ON logistics_stocktransaction (transaction_type, created_at);

-- Sevkiyatları durum ve oluşturma tarihine göre hızlı sorgulamak için
CREATE INDEX IF NOT EXISTS idx_shipment_status_created
    ON logistics_shipment (status, created_at);

-- Sevkiyatta sürücü ve araç bazlı sorgu performansı için
CREATE INDEX IF NOT EXISTS idx_shipment_driver_vehicle
    ON logistics_shipment (driver_id, vehicle_id);

-- Stok işlemini ürün ve raf bazında izlemek için
CREATE INDEX IF NOT EXISTS idx_inventory_product_shelf
    ON logistics_stocktransaction (product_id, shelf_id);


-- =================================================================
-- BÖLÜM 3: TRIGGER FONKSİYONLARI ve TRİGGERLAR
-- =================================================================

-- -----------------------------------------------------------------
-- TRIGGER 1: Sevkiyat Durum Değişimi Loglama
--
-- AMAÇ:
--   logistics_shipment tablosundaki bir satırın 'status' sütunu
--   güncellendiğinde, eski durum (old_status) ve yeni durum
--   (new_status) bilgilerini otomatik olarak logistics_shipmentlog
--   tablosuna ekler. Bu sayede her sevkiyatın tüm durum geçmişi
--   değiştirilemez bir şekilde saklanır.
--
-- TETİKLENME: logistics_shipment tablosunda UPDATE işleminden SONRA
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Durum gerçekten değiştiyse log kaydı oluştur
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO logistics_shipmentlog (shipment_id, old_status, new_status)
        VALUES (OLD.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı önce kaldır (varsa), sonra yeniden oluştur
DROP TRIGGER IF EXISTS trg_shipment_status_change ON logistics_shipment;

CREATE TRIGGER trg_shipment_status_change
    AFTER UPDATE ON logistics_shipment
    FOR EACH ROW
    EXECUTE FUNCTION log_shipment_status_change();


-- -----------------------------------------------------------------
-- TRIGGER 2: Stok Güncelleme ve Kritik Stok Uyarısı
--
-- AMAÇ:
--   logistics_stocktransaction tablosuna yeni bir kayıt eklendiğinde
--   iki işlem otomatik olarak gerçekleşir:
--
--   (a) STOK GÜNCELLEME:
--       - transaction_type = 'IN'  → ürünün total_stock değeri artırılır
--       - transaction_type = 'OUT' → ürünün total_stock değeri azaltılır
--
--   (b) KRİTİK STOK KONTROLÜ:
--       Güncelleme sonrasında ürünün mevcut stoğu, critical_stock_level
--       değerinin altına düşmüşse logistics_stockalert tablosuna
--       otomatik bir uyarı kaydı eklenir.
--
-- TETİKLENME: logistics_stocktransaction tablosuna INSERT işleminden SONRA
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INT;
    critical_lvl  INT;
BEGIN
    -- (a) Stok miktarını güncelle
    IF NEW.transaction_type = 'IN' THEN
        UPDATE logistics_product
        SET    total_stock = total_stock + NEW.quantity
        WHERE  id = NEW.product_id;

    ELSIF NEW.transaction_type = 'OUT' THEN
        UPDATE logistics_product
        SET    total_stock = total_stock - NEW.quantity
        WHERE  id = NEW.product_id;
    END IF;

    -- (b) Güncel stok ve kritik eşiği oku
    SELECT total_stock, critical_stock_level
    INTO   current_stock, critical_lvl
    FROM   logistics_product
    WHERE  id = NEW.product_id;

    -- Stok kritik eşiğin altındaysa uyarı kaydı oluştur
    IF current_stock < critical_lvl THEN
        INSERT INTO logistics_stockalert (product_id, message, resolved)
        VALUES (
            NEW.product_id,
            'Kritik Stok Uyarisi! Mevcut stok: ' || current_stock,
            FALSE
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı önce kaldır (varsa), sonra yeniden oluştur
DROP TRIGGER IF EXISTS trg_update_stock ON logistics_stocktransaction;

CREATE TRIGGER trg_update_stock
    AFTER INSERT ON logistics_stocktransaction
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();


-- =================================================================
-- BÖLÜM 4: ÖRNEK VERİ (SEED DATA)
-- =================================================================

-- Rota verileri
INSERT INTO logistics_route (start_point, end_point, distance_km, estimated_hours)
VALUES
    ('Istanbul', 'Ankara',  450, 6),
    ('Izmir',    'Antalya', 330, 4)
ON CONFLICT DO NOTHING;

-- Araç verileri
INSERT INTO logistics_vehicle (plate_number, capacity_kg, is_active)
VALUES ('34 ABC 123', 5000.0, TRUE)
ON CONFLICT DO NOTHING;

-- Hangar bölge verileri
INSERT INTO logistics_hangarregion (name, description)
VALUES
    ('Bölge A - Elektronik', 'Elektronik eşyalar için ayrılmış bölüm'),
    ('Bölge B - Gıda',       'Soğuk zincir ve genel gıda bölümü')
ON CONFLICT DO NOTHING;

-- Raf verileri (bölgelerle ilişkili)
INSERT INTO logistics_shelf (shelf_code, region_id)
SELECT 'RAF-A1', id FROM logistics_hangarregion WHERE name = 'Bölge A - Elektronik'
ON CONFLICT DO NOTHING;

INSERT INTO logistics_shelf (shelf_code, region_id)
SELECT 'RAF-A2', id FROM logistics_hangarregion WHERE name = 'Bölge A - Elektronik'
ON CONFLICT DO NOTHING;

INSERT INTO logistics_shelf (shelf_code, region_id)
SELECT 'RAF-B1', id FROM logistics_hangarregion WHERE name = 'Bölge B - Gıda'
ON CONFLICT DO NOTHING;

INSERT INTO logistics_shelf (shelf_code, region_id)
SELECT 'RAF-B2', id FROM logistics_hangarregion WHERE name = 'Bölge B - Gıda'
ON CONFLICT DO NOTHING;

-- Personel verileri
INSERT INTO logistics_personnel (first_name, last_name, role)
VALUES
    ('Ahmet',  'Yılmaz', 'WORKER'),
    ('Mehmet', 'Kaya',   'DRIVER')
ON CONFLICT DO NOTHING;


-- =================================================================
-- BÖLÜM 5: TRIGGER DOĞRULAMA SORGULARI
-- (Bu sorgular trigger'ların doğru kurulduğunu doğrulamak içindir)
-- =================================================================

-- Aktif trigger'ları listele
SELECT
    trigger_name,
    event_manipulation  AS tetikleyen_olay,
    event_object_table  AS tablo,
    action_timing       AS zamanlama
FROM information_schema.triggers
WHERE event_object_table IN (
    'logistics_stocktransaction',
    'logistics_shipment'
)
ORDER BY event_object_table;
