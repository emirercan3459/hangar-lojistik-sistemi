from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.database import engine, Base, get_db
from backend.models import *
from backend import schemas
import uuid
import random
import requests

# Veritabanı tablolarını (ve trigger/indexleri) oluşturur
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Hangar Lojistik API",
    description="Hangar Lojistik Yönetimi için FastAPI Backend",
    version="1.0.0"
)

# React Frontend'in API'ye erişebilmesi için CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Geliştirme ortamı için her yere açık (Canlıda ["http://localhost:3000"] olmalı)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hangar Lojistik API Çalışıyor. Dokümantasyon için /docs adresine gidin."}

# ==========================================
# 1. ÜRÜN (PRODUCT) ENDPOINT'LERİ
# ==========================================
@app.get("/api/products", response_model=list[schemas.Product])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

@app.post("/api/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
        db.add(SystemActionLog(
            action_type="ÜRÜN_EKLENDİ",
            description=f"Yeni ürün sisteme tanımlandı: {product.name} (SKU: {product.sku})",
            actor="SYSTEM_ADMIN"
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_product

@app.put("/api/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    for key, value in product.model_dump().items():
        setattr(db_product, key, value)
    try:
        db.commit()
        db.refresh(db_product)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_product

@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    db.delete(db_product)
    db.commit()

# ==========================================
# 2. STOK İŞLEMLERİ (GİRİŞ/ÇIKIŞ) ENDPOINT'İ
# NOT: Bu işlem çalıştığında PostgreSQL'deki Trigger tetiklenecek 
# ve total_stock'u otomatik güncelleyecektir.
# ==========================================
@app.post("/api/stock/transaction", response_model=schemas.StockTransaction)
def make_stock_transaction(trans: schemas.StockTransactionCreate, db: Session = Depends(get_db)):
    # Önce ürün var mı kontrol edelim
    product = db.query(Product).filter(Product.id == trans.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Çıkış yapılacaksa stok yeterli mi? (Basit kontrol)
    if trans.transaction_type == 'OUT' and product.total_stock < trans.quantity:
        raise HTTPException(status_code=400, detail="Yetersiz stok!")

    new_trans = StockTransaction(**trans.model_dump())
    db.add(new_trans)
    
    try:
        db.commit()
        db.refresh(new_trans)
        
        # Log Kaydı
        action_name = "STOK_GİRİŞİ" if trans.transaction_type == "IN" else "STOK_ÇIKIŞI"
        db.add(SystemActionLog(
            action_type=action_name,
            description=f"{product.name} ürünü için {trans.quantity} adet {trans.transaction_type} işlemi yapıldı.",
            actor="DEPO_GÖREVLİSİ"
        ))
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    return new_trans

# ==========================================
# 3. KISA ÖZET (DASHBOARD) İSTATİSTİKLERİ
# ==========================================
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    active_alerts = db.query(StockAlert).filter(StockAlert.resolved == False).count()
    total_shipments = db.query(Shipment).count()
    
    return {
        "total_products": total_products,
        "critical_alerts": active_alerts,
        "total_shipments": total_shipments
    }

# ==========================================
# 4. PERSONEL VE YETKİ ENDPOINT'LERİ
# ==========================================
@app.get("/api/personnel", response_model=list[schemas.Personnel])
def get_personnel(db: Session = Depends(get_db)):
    return db.query(Personnel).all()

@app.post("/api/personnel", response_model=schemas.Personnel)
def create_personnel(person: schemas.PersonnelCreate, db: Session = Depends(get_db)):
    db_person = Personnel(**person.model_dump())
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

@app.put("/api/personnel/{person_id}", response_model=schemas.Personnel)
def update_personnel(person_id: int, person: schemas.PersonnelCreate, db: Session = Depends(get_db)):
    db_person = db.query(Personnel).filter(Personnel.id == person_id).first()
    if not db_person:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    for key, value in person.model_dump().items():
        setattr(db_person, key, value)
    db.commit()
    db.refresh(db_person)
    return db_person

@app.delete("/api/personnel/{person_id}", status_code=204)
def delete_personnel(person_id: int, db: Session = Depends(get_db)):
    db_person = db.query(Personnel).filter(Personnel.id == person_id).first()
    if not db_person:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    db.delete(db_person)
    db.commit()

# ==========================================
# 5. SEVKİYAT (SHIPMENT) ENDPOINT'LERİ
# ==========================================
@app.get("/api/shipments", response_model=list[schemas.Shipment])
def get_shipments(db: Session = Depends(get_db)):
    return db.query(Shipment).all()

@app.post("/api/shipments", response_model=schemas.Shipment)
def create_shipment(shipment: schemas.ShipmentCreate, db: Session = Depends(get_db)):
    # Rastgele / Benzersiz Kargo Takip Kodu Oluşturma (Örn: HNG-345-A6B9)
    random_str = str(uuid.uuid4()).split('-')[0].upper()
    auto_tracking_number = f"HNG-{random.randint(100, 999)}-{random_str}"
    
    shipment_data = shipment.model_dump()
    shipment_data["tracking_number"] = auto_tracking_number
    
    db_shipment = Shipment(**shipment_data)
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    
    # Log Kaydı
    db.add(SystemActionLog(
        action_type="SEVKİYAT_OLUŞTURULDU",
        description=f"Yeni sevkiyat planlaması yapıldı. Takip No: {auto_tracking_number}",
        actor="LOJİSTİK_UZMANI"
    ))
    db.commit()
    
    return db_shipment

@app.delete("/api/shipments/{shipment_id}", status_code=204)
def delete_shipment(shipment_id: int, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Sevkiyat bulunamadı")
    db.delete(shipment)
    db.commit()

# ==========================================
# 6. ROTA VE ARAÇ (ROUTE & VEHICLE) ENDPOINT'LERİ
# ==========================================
@app.get("/api/routes", response_model=list[schemas.Route])
def get_routes(db: Session = Depends(get_db)):
    return db.query(Route).all()

@app.post("/api/routes", response_model=schemas.Route)
def create_route(route: schemas.RouteCreate, db: Session = Depends(get_db)):
    db_route = Route(**route.model_dump())
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route

@app.delete("/api/routes/{route_id}", status_code=204)
def delete_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Rota bulunamadı")
    db.delete(route)
    db.commit()

@app.get("/api/vehicles", response_model=list[schemas.Vehicle])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()

@app.post("/api/vehicles", response_model=schemas.Vehicle)
def create_vehicle(vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):
    db_vehicle = Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@app.delete("/api/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    db.delete(vehicle)
    db.commit()


# ==========================================
# 7. SISTEM LOG (AUDIT TRAIL) ENDPOINTLERI
# ==========================================
@app.get("/api/logs", response_model=list[schemas.SystemActionLog])
def get_system_logs(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return db.query(SystemActionLog).order_by(SystemActionLog.created_at.desc()).offset(skip).limit(limit).all()

@app.post("/api/logs", response_model=schemas.SystemActionLog)
def create_system_log(log: schemas.SystemActionLogCreate, db: Session = Depends(get_db)):
    db_log = SystemActionLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# ==========================================
# 7.5. YENİ GELİŞMİŞ ÖZELLİKLER ENDPOINT'LERİ
# ==========================================
@app.get("/api/shipments/{shipment_id}/weather")
def get_shipment_weather(shipment_id: int, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Sevkiyat bulunamadı")
    
    route = db.query(Route).filter(Route.id == shipment.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Sevkiyat rotası bulunamadı")
    city_name = route.end_point
    lat, lon = "41.0082", "28.9784"
    
    try:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1&format=json"
        geo_res = requests.get(geo_url, timeout=5)
        if geo_res.status_code == 200:
            geo_data = geo_res.json()
            if geo_data.get("results"):
                lat = str(geo_data["results"][0]["latitude"])
                lon = str(geo_data["results"][0]["longitude"])
                
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        weather_res = requests.get(weather_url, timeout=5)
        if weather_res.status_code == 200:
            w_data = weather_res.json().get("current_weather", {})
            return {
                "tracking_number": shipment.tracking_number,
                "destination": city_name,
                "temperature": w_data.get("temperature"),
                "windspeed": w_data.get("windspeed"),
                "weathercode": w_data.get("weathercode")
            }
        else:
            raise HTTPException(status_code=502, detail="Hava durumu servisinden yanıt alınamadı")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Hava durumu API bağlantı hatası: {str(e)}")

@app.put("/api/shipments/{shipment_id}/status", response_model=schemas.Shipment)
def update_shipment_status(shipment_id: int, status_update: dict, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Sevkiyat bulunamadı")
    
    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status alanı zorunludur")
        
    old_status = shipment.status
    shipment.status = new_status
    
    try:
        db.commit()
        db.refresh(shipment)
        
        db.add(SystemActionLog(
            action_type="SEVKİYAT_DURUMU_GÜNCELLENDİ",
            description=f"{shipment.tracking_number} takip numaralı sevkiyat durumu '{old_status}' değerinden '{new_status}' değerine güncellendi.",
            actor="LOJİSTİK_OPERATÖRÜ"
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
    return shipment

@app.get("/api/alerts", response_model=list[schemas.StockAlert])
def get_alerts(db: Session = Depends(get_db)):
    return db.query(StockAlert).filter(StockAlert.resolved == False).order_by(StockAlert.created_at.desc()).all()

@app.post("/api/alerts/{alert_id}/resolve", response_model=schemas.StockAlert)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(StockAlert).filter(StockAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Uyarı bulunamadı")
    alert.resolved = True
    db.commit()
    db.refresh(alert)
    return alert

@app.get("/api/shipments/{shipment_id}/logs", response_model=list[schemas.ShipmentLog])
def get_shipment_logs(shipment_id: int, db: Session = Depends(get_db)):
    return db.query(ShipmentLog).filter(ShipmentLog.shipment_id == shipment_id).order_by(ShipmentLog.changed_at.desc()).all()

@app.get("/api/shelves", response_model=list[schemas.Shelf])
def get_shelves(db: Session = Depends(get_db)):
    return db.query(Shelf).all()

# ==========================================
# 8. SİSTEM BAŞLANGIÇ VERİLERİ (SEED DATA)
# ==========================================
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    # 1. Rota ekle
    if db.query(Route).count() == 0:
        db.add(Route(start_point="Istanbul", end_point="Ankara", distance_km=450, estimated_hours=6))
        db.add(Route(start_point="Izmir", end_point="Antalya", distance_km=330, estimated_hours=4))
    
    # 2. Araç ekle
    if db.query(Vehicle).count() == 0:
        db.add(Vehicle(plate_number="34 ABC 123", capacity_kg=5000.0, is_active=True))
        
    # 3. Bölgeler ekle
    if db.query(HangarRegion).count() == 0:
        db.add(HangarRegion(name="Bölge A - Elektronik", description="Elektronik eşyalar için ayrılmış bölüm"))
        db.add(HangarRegion(name="Bölge B - Gıda", description="Soğuk zincir ve genel gıda bölümü"))
        db.commit()

    # 4. Raflar ekle
    if db.query(Shelf).count() == 0:
        region_a = db.query(HangarRegion).filter(HangarRegion.name == "Bölge A - Elektronik").first()
        region_b = db.query(HangarRegion).filter(HangarRegion.name == "Bölge B - Gıda").first()
        
        if region_a:
            db.add(Shelf(shelf_code="RAF-A1", region_id=region_a.id))
            db.add(Shelf(shelf_code="RAF-A2", region_id=region_a.id))
        if region_b:
            db.add(Shelf(shelf_code="RAF-B1", region_id=region_b.id))
            db.add(Shelf(shelf_code="RAF-B2", region_id=region_b.id))
        
    # 5. Personel ekle
    if db.query(Personnel).count() == 0:
        db.add(Personnel(first_name="Ahmet", last_name="Yılmaz", role="WORKER"))
        db.add(Personnel(first_name="Mehmet", last_name="Kaya", role="DRIVER"))
        
    db.commit()
    return {"message": "Sistem baslangic verileri eklendi!"}
