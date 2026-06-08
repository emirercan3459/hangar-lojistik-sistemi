from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import event, DDL
from backend.database import Base

class Product(Base):
    __tablename__ = "logistics_product"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    total_stock = Column(Integer, nullable=False, default=0)
    critical_stock_level = Column(Integer, nullable=False, default=10)

class HangarRegion(Base):
    __tablename__ = "logistics_hangarregion"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

class Shelf(Base):
    __tablename__ = "logistics_shelf"
    
    id = Column(Integer, primary_key=True, index=True)
    shelf_code = Column(String(50), unique=True, nullable=False)
    region_id = Column(Integer, ForeignKey("logistics_hangarregion.id", ondelete="CASCADE"), nullable=False)

class Personnel(Base):
    __tablename__ = "logistics_personnel"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)  # 'MANAGER', 'WORKER', 'DRIVER'

class StockTransaction(Base):
    __tablename__ = "logistics_stocktransaction"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String(3), nullable=False)  # 'IN' veya 'OUT'
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product_id = Column(Integer, ForeignKey("logistics_product.id", ondelete="CASCADE"), nullable=False)
    personnel_id = Column(Integer, ForeignKey("logistics_personnel.id", ondelete="SET NULL"), nullable=True)
    shelf_id = Column(Integer, ForeignKey("logistics_shelf.id", ondelete="SET NULL"), nullable=True)

class StockAlert(Base):
    __tablename__ = "logistics_stockalert"
    
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String(255), nullable=False)
    resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    product_id = Column(Integer, ForeignKey("logistics_product.id", ondelete="CASCADE"), nullable=False)

class Vehicle(Base):
    __tablename__ = "logistics_vehicle"
    
    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(20), unique=True, nullable=False)
    capacity_kg = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

class Route(Base):
    __tablename__ = "logistics_route"
    
    id = Column(Integer, primary_key=True, index=True)
    start_point = Column(String(255), nullable=False)
    end_point = Column(String(255), nullable=False)
    distance_km = Column(Numeric(8, 2), nullable=False)
    estimated_hours = Column(Numeric(5, 2), nullable=False)

class Shipment(Base):
    __tablename__ = "logistics_shipment"
    
    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String(100), unique=True, nullable=False)
    weight_kg = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), nullable=False, default='PENDING')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    product_id = Column(Integer, ForeignKey("logistics_product.id", ondelete="SET NULL"), nullable=True)
    route_id = Column(Integer, ForeignKey("logistics_route.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("logistics_vehicle.id", ondelete="SET NULL"), nullable=True)
    driver_id = Column(Integer, ForeignKey("logistics_personnel.id", ondelete="SET NULL"), nullable=True)

    route = relationship("Route", foreign_keys=[route_id])

class ShipmentLog(Base):
    __tablename__ = "logistics_shipmentlog"
    
    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, nullable=False)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemActionLog(Base):
    __tablename__ = "logistics_systemactionlog"
    
    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(100), nullable=False)   # e.g., 'CREATE_PRODUCT', 'DELETE_PRODUCT', 'SHIPMENT_UPDATE'
    description = Column(Text, nullable=False)
    actor = Column(String(100), nullable=False, default='SYSTEM')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ==========================================
# İNDEKSLER
# ==========================================
Index('idx_stocktransaction_type_date', StockTransaction.transaction_type, StockTransaction.created_at)
Index('idx_shipment_status_created', Shipment.status, Shipment.created_at)
Index('idx_shipment_driver_vehicle', Shipment.driver_id, Shipment.vehicle_id)
Index('idx_inventory_product_shelf', StockTransaction.product_id, StockTransaction.shelf_id)


# ==========================================
# POSTGRESQL FONKSİYON VE TRİGGERLARI
# (SQLAlchemy tabloları oluşturduktan sonra bu kodları OTOMATIK veritabanına işler)
# ==========================================

# 1. Kargo/Sevkiyat Log Trigger
trg_shipment_log = DDL('''
CREATE OR REPLACE FUNCTION log_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO logistics_shipmentlog (shipment_id, old_status, new_status)
        VALUES (OLD.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipment_status_change ON logistics_shipment;
CREATE TRIGGER trg_shipment_status_change
AFTER UPDATE ON logistics_shipment
FOR EACH ROW
EXECUTE FUNCTION log_shipment_status_change();
''')
event.listen(Shipment.__table__, 'after_create', trg_shipment_log)

# 2. Stok Kontrol & Uyarı Trigger
trg_stock_update = DDL('''
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INT;
    critical_lvl INT;
BEGIN
    IF NEW.transaction_type = 'IN' THEN
        UPDATE logistics_product SET total_stock = total_stock + NEW.quantity WHERE id = NEW.product_id;
    ELSIF NEW.transaction_type = 'OUT' THEN
        UPDATE logistics_product SET total_stock = total_stock - NEW.quantity WHERE id = NEW.product_id;
    END IF;

    SELECT total_stock, critical_stock_level INTO current_stock, critical_lvl 
    FROM logistics_product WHERE id = NEW.product_id;

    IF current_stock < critical_lvl THEN
        INSERT INTO logistics_stockalert (product_id, message, resolved)
        VALUES (NEW.product_id, 'Kritik Stok Uyarisi! Mevcut stok: ' || current_stock, FALSE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock ON logistics_stocktransaction;
CREATE TRIGGER trg_update_stock
AFTER INSERT ON logistics_stocktransaction
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();
''')
event.listen(StockTransaction.__table__, 'after_create', trg_stock_update)
