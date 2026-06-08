from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    sku: str
    description: Optional[str] = None
    critical_stock_level: int = 10

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    total_stock: int

    class Config:
        from_attributes = True

# --- Stock Transaction Schemas ---
class StockTransactionBase(BaseModel):
    transaction_type: str  # 'IN' veya 'OUT'
    quantity: int
    product_id: int

class StockTransactionCreate(StockTransactionBase):
    personnel_id: Optional[int] = None
    shelf_id: Optional[int] = None

class StockTransaction(StockTransactionBase):
    id: int
    created_at: datetime
    personnel_id: Optional[int] = None
    shelf_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- Personnel Schemas ---
class PersonnelBase(BaseModel):
    first_name: str
    last_name: str
    role: str # 'MANAGER', 'WORKER', 'DRIVER'

class PersonnelCreate(PersonnelBase):
    pass

class Personnel(PersonnelBase):
    id: int
    class Config:
        from_attributes = True

# --- Route Models (Sevkiyat için) ---
class RouteBase(BaseModel):
    start_point: str
    end_point: str
    distance_km: float
    estimated_hours: float

class RouteCreate(RouteBase):
    pass

class Route(RouteBase):
    id: int
    class Config:
        from_attributes = True

# --- Vehicle Models ---
class VehicleBase(BaseModel):
    plate_number: str
    capacity_kg: float
    is_active: bool = True

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: int
    class Config:
        from_attributes = True

# --- Shipment Schemas ---
class ShipmentBase(BaseModel):
    weight_kg: float
    status: str = "PENDING"
    product_id: Optional[int] = None
    route_id: int

class ShipmentCreate(ShipmentBase):
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None

class Shipment(ShipmentBase):
    id: int
    tracking_number: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- System Action Log Schemas ---
class SystemActionLogBase(BaseModel):
    action_type: str
    description: str
    actor: str = "SYSTEM"

class SystemActionLogCreate(SystemActionLogBase):
    pass

class SystemActionLog(SystemActionLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Hangar Region & Shelf Schemas ---
class HangarRegionBase(BaseModel):
    name: str
    description: Optional[str] = None

class HangarRegionCreate(HangarRegionBase):
    pass

class HangarRegion(HangarRegionBase):
    id: int
    class Config:
        from_attributes = True

class ShelfBase(BaseModel):
    shelf_code: str
    region_id: int

class ShelfCreate(ShelfBase):
    pass

class Shelf(ShelfBase):
    id: int
    class Config:
        from_attributes = True

# --- Stock Alert Schemas ---
class StockAlertBase(BaseModel):
    message: str
    resolved: bool = False
    product_id: int

class StockAlertCreate(StockAlertBase):
    pass

class StockAlert(StockAlertBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Shipment Log Schemas ---
class ShipmentLogBase(BaseModel):
    shipment_id: int
    old_status: str
    new_status: str

class ShipmentLogCreate(ShipmentLogBase):
    pass

class ShipmentLog(ShipmentLogBase):
    id: int
    changed_at: datetime
    class Config:
        from_attributes = True

