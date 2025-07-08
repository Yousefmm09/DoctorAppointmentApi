import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationComponent from '../components/NotificationComponent';
import { useAppContext } from '../context/AppContext';

const MainLayout = () => {
  const { token } = useAppContext();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Notification component (only for authenticated users) */}
        {token && (
          <div className="fixed top-4 right-4 z-50">
            <NotificationComponent />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout; 