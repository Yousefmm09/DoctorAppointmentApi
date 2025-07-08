import React, { useContext, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { AppContext } from '../context/AppContext';

const Layout = ({ showSidebar = true, menuItems = [], children }) => {
  const location = useLocation();
  const { token, userRole } = useContext(AppContext);
  
  // Check if this is the public home route
  const isPublicHome = location.pathname === '/' || location.pathname === '/public/home';
  
  // Add debug logging
  useEffect(() => {
    console.log("Layout rendered at path:", location.pathname);
    console.log("Sidebar visible:", showSidebar);
    console.log("Menu items:", menuItems.length ? menuItems.map(item => item.title).join(', ') : 'None');
    console.log("Auth state - Token exists:", !!token);
    console.log("Auth state - User role:", userRole || 'None');
    console.log("Is public home:", isPublicHome);
  }, [location.pathname, showSidebar, menuItems, token, userRole, isPublicHome]);

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      
      <div className="flex flex-grow">
        {/* Sidebar - Only show if needed */}
        {showSidebar && !isPublicHome && (
          <div className="hidden md:block w-64 bg-white border-r shadow-md">
            <Sidebar menuItems={menuItems} />
          </div>
        )}
        
        {/* Main Content */}
        <main className={`flex-grow ${isPublicHome ? 'p-0' : 'p-4 md:p-8'} bg-slate-50 ${showSidebar && !isPublicHome ? 'md:ml-0' : ''}`}>
          {children || <Outlet />}
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Layout; 