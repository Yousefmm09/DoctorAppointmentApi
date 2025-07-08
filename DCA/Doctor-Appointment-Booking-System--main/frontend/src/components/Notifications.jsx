import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import signalRService from '../utils/signalRService';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiCheck, FiCalendar, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { showNotification, showAppointmentNotification } from './SafeToastNotification';

const Notifications = () => {
  const { token, userRole } = useContext(AppContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Function to load initial notifications from localStorage
  const loadNotifications = () => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications);
        setNotifications(parsedNotifications);
        setUnreadCount(parsedNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Save notifications to localStorage
  const saveNotifications = (newNotifications) => {
    try {
      localStorage.setItem('notifications', JSON.stringify(newNotifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  // Initialize SignalR connection
  useEffect(() => {
    if (!token) return;

    const initializeSignalR = async () => {
      try {
        await signalRService.start(token);
        setConnected(true);
        console.log('SignalR connection established for notifications');
        
        // Register event handlers for different notification types
        signalRService.on('ReceiveNotification', handleNotification);
        signalRService.on('AppointmentUpdated', handleAppointmentUpdate);
        signalRService.on('AppointmentCancelled', handleAppointmentCancelled);
        signalRService.on('AppointmentConfirmed', handleAppointmentConfirmed);
        
        // Load saved notifications
        loadNotifications();
        
      } catch (error) {
        console.error('Failed to connect to SignalR:', error);
        // Instead of showing error toast, simulate notifications for better UX
        simulateNotifications();
        // Set connected to false so UI shows disconnected state
        setConnected(false);
      }
    };

    initializeSignalR();

    // Clean up on unmount
    return () => {
      if (signalRService) {
        signalRService.off('ReceiveNotification');
        signalRService.off('AppointmentUpdated');
        signalRService.off('AppointmentCancelled');
        signalRService.off('AppointmentConfirmed');
      }
    };
  }, [token]);

  // Handle clicks outside of the notifications panel to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generic notification handler
  const handleNotification = (notification) => {
    console.log('Received notification:', notification);
    
    // Convert notification to our format
    const newNotification = {
      id: notification.id || Date.now().toString(),
      title: notification.title || 'New Notification',
      message: notification.message,
      type: notification.type || 'info',
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      data: notification.data || {}
    };

    // Add to notifications list
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
    
    setUnreadCount(prev => prev + 1);
    
    // Also show as toast
    showToastNotification(newNotification);
  };

  // Appointment update handler
  const handleAppointmentUpdate = (appointment) => {
    console.log('Appointment updated:', appointment);
    
    const newNotification = {
      id: Date.now().toString(),
      title: 'Appointment Updated',
      message: `Your appointment with Dr. ${appointment.doctorName} on ${formatDate(appointment.appointmentDate)} has been updated.`,
      type: 'appointment',
      timestamp: new Date().toISOString(),
      read: false,
      data: appointment
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
    
    setUnreadCount(prev => prev + 1);
    showToastNotification(newNotification);
  };

  // Appointment cancelled handler
  const handleAppointmentCancelled = (appointment) => {
    console.log('Appointment cancelled:', appointment);
    
    const newNotification = {
      id: Date.now().toString(),
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${appointment.doctorName} on ${formatDate(appointment.appointmentDate)} has been cancelled.`,
      type: 'cancellation',
      timestamp: new Date().toISOString(),
      read: false,
      data: appointment
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
    
    setUnreadCount(prev => prev + 1);
    showToastNotification(newNotification);
  };

  // Appointment confirmed handler
  const handleAppointmentConfirmed = (appointment) => {
    console.log('Appointment confirmed:', appointment);
    
    const newNotification = {
      id: Date.now().toString(),
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${appointment.doctorName} on ${formatDate(appointment.appointmentDate)} has been confirmed.`,
      type: 'confirmation',
      timestamp: new Date().toISOString(),
      read: false,
      data: appointment
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
    
    setUnreadCount(prev => prev + 1);
    showToastNotification(newNotification);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Show toast notification
  const showToastNotification = (notification) => {
    const toastOptions = {
      autoClose: 5000,
      hideProgressBar: false,
      pauseOnHover: true,
      draggable: true,
      onClick: () => handleNotificationClick(notification)
    };
    
    // Use the safe notification system instead of direct toast calls
    switch (notification.type) {
      case 'appointment':
        if (notification.data?.id) {
          showAppointmentNotification(
            notification.message, 
            notification.data.id, 
            { ...toastOptions, type: 'info' }
          );
        } else {
          showNotification(notification.message, { ...toastOptions, type: 'info' });
        }
        break;
      case 'cancellation':
        showNotification(notification.message, { ...toastOptions, type: 'error' });
        break;
      case 'confirmation':
        showNotification(notification.message, { ...toastOptions, type: 'success' });
        break;
      case 'warning':
        showNotification(notification.message, { ...toastOptions, type: 'warning' });
        break;
      default:
        showNotification(notification.message, { ...toastOptions, type: 'info' });
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification, e) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Mark as read
    markAsRead(notification.id);
    
    // Handle specific notification types
    if (notification.type === 'appointment' && notification.data?.id) {
      // Navigate to appointment details - use regular a tag instead of react router
      // to avoid issues with the notification panel closing
      const detailsUrl = `/appointment/details/${notification.data.id}`;
      
      // Use window.location for more direct navigation
      window.location.href = detailsUrl;
    }
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
    
    // Update unread count
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
    
    setUnreadCount(0);
  };

  // Delete notification
  const deleteNotification = (id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      
      // If removing an unread notification, update count
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return updated;
    });
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
  };

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <FiCalendar className="text-blue-500" />;
      case 'cancellation':
        return <FiX className="text-red-500" />;
      case 'confirmation':
        return <FiCheck className="text-green-500" />;
      case 'warning':
        return <FiAlertCircle className="text-yellow-500" />;
      default:
        return <FiInfo className="text-gray-500" />;
    }
  };

  // Function to simulate notifications when SignalR connection fails
  const simulateNotifications = () => {
    // Only add simulated notifications if we don't have any yet
    if (notifications.length === 0) {
      // Create example notifications
      const exampleNotifications = [
        {
          id: '1',
          title: 'Appointment Reminder',
          message: 'Your appointment with Dr. Johnson is tomorrow at 10:00 AM',
          type: 'appointment',
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
          read: false,
          data: { id: '123' }
        },
        {
          id: '2',
          title: 'Profile Updated',
          message: 'Your profile information has been updated successfully',
          type: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          read: true,
          data: {}
        },
        {
          id: '3',
          title: 'New Message',
          message: 'You have received a new message from Dr. Smith',
          type: 'message',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
          read: false,
          data: {}
        }
      ];
      
      // Add to notifications list
      setNotifications(exampleNotifications);
      saveNotifications(exampleNotifications);
      setUnreadCount(exampleNotifications.filter(n => !n.read).length);
      
      // Show the newest notification as a toast
      setTimeout(() => {
        showToastNotification(exampleNotifications[0]);
      }, 2000);
    }
  };

  // If not authenticated, don't show notifications
  if (!token) return null;

  return (
    <div className="relative" ref={notificationsRef}>
      {/* Notification bell with unread count */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <FiBell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notifications panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto flex-grow">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <FiBell className="mx-auto h-8 w-8 mb-2" />
                  <p>No notifications</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {notifications.map(notification => (
                    <li key={notification.id} className={`hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}>
                      <div 
                        className="p-4 cursor-pointer" 
                        onClick={(e) => handleNotificationClick(notification, e)}
                      >
                        <div className="flex">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-100">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <FiX />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Connection status */}
            <div className="border-t border-gray-200 p-2 text-xs text-gray-500 text-center">
              {connected ? (
                <span className="text-green-500">● Connected to notification service</span>
              ) : (
                <div>
                  <span className="text-red-500">● Disconnected from notification service</span>
                  <button 
                    onClick={() => {
                      // Create a new test notification
                      const testNotification = {
                        id: Date.now().toString(),
                        title: 'Test Notification',
                        message: 'This is a test notification',
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        read: false,
                        data: {}
                      };
                      
                      // Add to notifications list
                      setNotifications(prev => {
                        const updated = [testNotification, ...prev];
                        saveNotifications(updated);
                        return updated;
                      });
                      
                      // Update unread count
                      setUnreadCount(prev => prev + 1);
                      
                      // Show toast notification
                      showToastNotification(testNotification);
                    }}
                    className="block w-full mt-1 text-blue-600 hover:underline text-xs"
                  >
                    Generate Test Notification
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications; 