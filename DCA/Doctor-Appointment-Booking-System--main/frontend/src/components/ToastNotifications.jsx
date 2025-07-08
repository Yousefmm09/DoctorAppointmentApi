import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaTimes, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

// Toast context
export const ToastContext = React.createContext({
  showToast: () => {},
  hideToast: () => {},
});

// Toast types with corresponding icons and colors
const toastTypes = {
  success: {
    icon: <FaCheck />,
    bgColor: 'bg-green-500',
    textColor: 'text-white',
  },
  error: {
    icon: <FaTimes />,
    bgColor: 'bg-red-500',
    textColor: 'text-white',
  },
  info: {
    icon: <FaInfoCircle />,
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
  },
  warning: {
    icon: <FaExclamationTriangle />,
    bgColor: 'bg-yellow-500',
    textColor: 'text-black',
  },
};

// Individual Toast component
const Toast = ({ message, type = 'info', onClose, id }) => {
  const { icon, bgColor, textColor } = toastTypes[type] || toastTypes.info;
  
  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [id, onClose]);
  
  return (
    <div className={`flex items-center p-4 mb-3 rounded shadow-lg ${bgColor} ${textColor}`}>
      <div className="mr-3">
        {icon}
      </div>
      <div className="flex-grow">
        {message}
      </div>
      <button 
        onClick={() => onClose(id)} 
        className={`ml-3 ${textColor} hover:opacity-75 focus:outline-none`}
      >
        <FaTimes />
      </button>
    </div>
  );
};

// Toast Container that holds all current toasts
const ToastContainer = ({ toasts, removeToast }) => {
  return createPortal(
    <div className="fixed top-5 right-5 z-50 max-w-md">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={removeToast}
        />
      ))}
    </div>,
    document.body
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    return id;
  };

  const hideToast = (id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={hideToast} />
    </ToastContext.Provider>
  );
};

// Hook to use the toast context
export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider; 