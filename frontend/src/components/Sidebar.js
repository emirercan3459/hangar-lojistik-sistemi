import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, Users, Settings, Activity } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>✈️ Hangar</h2>
      </div>
      <nav className="nav-menu">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/products" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Package size={20} />
          <span>Ürün Yönetimi</span>
        </NavLink>
        <NavLink to="/shipments" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Truck size={20} />
          <span>Sevkiyatlar</span>
        </NavLink>
        <NavLink to="/personnel" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Users size={20} />
          <span>Personel & Yetki</span>
        </NavLink>
        <NavLink to="/logs" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Activity size={20} />
          <span>Sistem Logları</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Settings size={20} />
          <span>Ayarlar</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;