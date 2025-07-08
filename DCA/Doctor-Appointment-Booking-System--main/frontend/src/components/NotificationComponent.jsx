import React, { useState, useEffect } from 'react';
import { FiBell, FiX, FiCheck, FiCalendar, FiMessageSquare, FiInfo, FiTrash } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import * as signalR from '@microsoft/signalr';
import { toast } from 'react-toastify';
import api from '../services/api';

const NotificationComponent = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [connection, setConnection] = useState(null);
  const { token, userRole, userData } = useAppContext();
  const navigate = useNavigate();

  // Initialize SignalR connection
  useEffect(() => {
    if (token && userData?.id) {
      // Create SignalR connection
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5109'}/notificationhub`, {
          accessTokenFactory: () => token,
          // Add a timeout to prevent long-hanging connection attempts
          timeout: 10000 // 10 seconds
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Customize retry intervals
        .configureLogging(signalR.LogLevel.Warning) // Only log warnings and errors
        .build();

      // Handler for receiving notifications
      newConnection.on('ReceiveNotification', notification => {
        handleNewNotification(notification);
      });

      // Track if component is still mounted
      let isMounted = true;

      // Start connection
      newConnection.start()
        .then(() => {
          if (!isMounted) return;
          console.log('Connected to notification hub');
          const userId = userData?.id;
          if (!userId) {
            console.warn('Cannot join notification group: No valid user ID');
            return Promise.reject('No valid user ID');
          }
          return newConnection.invoke('JoinUserGroup', userId);
        })
        .then(() => {
          if (!isMounted) return;
          console.log('Joined user notification group');
          setConnection(newConnection);
        })
        .catch(err => {
          if (!isMounted) return;
          
          // Don't log errors for missing user ID (we already logged a warning)
          if (err === 'No valid user ID') return;
          
          // Don't log connection errors when the server is down
          if (err.message?.includes('Failed to fetch') || 
              err.message?.includes('Network Error') ||
              err.message?.includes('Failed to complete negotiation')) {
            console.warn('Notification hub connection unavailable - server may be down');
          } else {
            console.error('Error connecting to notification hub:', err);
          }
        });

      // Clean up on unmount
      return () => {
        isMounted = false;
        if (newConnection && newConnection.state === signalR.HubConnectionState.Connected) {
          newConnection.stop().catch(err => {
            console.warn('Error stopping notification hub connection:', err);
          });
        }
      };
    }
  }, [token, userData]);

  // Load initial notifications
  useEffect(() => {
    if (token && userData?.id) {
      fetchNotifications();
      fetchUnreadCount();

      // Set up interval to refresh notifications
      const intervalId = setInterval(() => {
        fetchUnreadCount();
      }, 60000); // Check every minute

      return () => clearInterval(intervalId);
    }
  }, [token, userData]);

  const fetchNotifications = async () => {
    try {
      // Check if we have a valid user ID before making the request
      if (!userData?.id) {
        console.log('Skipping notification fetch: No valid user ID');
        return;
      }
      
      const response = await api.get('/notifications');
      setNotifications(response.data || []);
    } catch (error) {
      // Only log once for network errors
      if (!error.message?.includes('Network Error') && 
          !error.message?.includes('Failed to fetch')) {
        console.error('Error fetching notifications:', error);
        
        // Don't display errors for 400 Bad Request (Invalid user account)
        if (error.response?.status !== 400) {
          console.error('Notification fetch error details:', error);
        }
      }
    }
  };

  const fetchUnreadCount = async () => {
    try {
      // Check if we have a valid user ID before making the request
      if (!userData?.id) {
        console.log('Skipping unread count fetch: No valid user ID');
        return;
      }
      
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      // Only log once for network errors
      if (!error.message?.includes('Network Error') && 
          !error.message?.includes('Failed to fetch')) {
        console.error('Error fetching unread count:', error);
        
        // Don't display errors for 400 Bad Request (Invalid user account)
        if (error.response?.status !== 400) {
          console.error('Unread count fetch error details:', error);
        }
      }
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast
    toast.info(notification.message, {
      position: "top-right",
      autoClose: 5000
    });
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Navigate based on content (e.g. appointment, message)
    if (notification.message.toLowerCase().includes('appointment')) {
      if (userRole === 'Doctor') {
        navigate('/doctor/appointments');
      } else if (userRole === 'Patient') {
        navigate('/patient/appointments');
      }
    } else if (notification.message.toLowerCase().includes('message')) {
      if (userRole === 'Doctor') {
        navigate('/doctor/chat');
      } else if (userRole === 'Patient') {
        navigate('/patient/chat');
      }
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id, event) => {
    event.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update unread count if needed
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (message) => {
    if (message.toLowerCase().includes('appointment')) {
      return <FiCalendar className="text-blue-500" />;
    } else if (message.toLowerCase().includes('message')) {
      return <FiMessageSquare className="text-green-500" />;
    } else if (message.toLowerCase().includes('cancelled')) {
      return <FiX className="text-red-500" />;
    } else if (message.toLowerCase().includes('confirmed')) {
      return <FiCheck className="text-green-500" />;
    } else {
      return <FiInfo className="text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000; // Seconds
    
    if (diff < 60) {
      return 'Just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diff < 604800) {
      const days = Math.floor(diff / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!token) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          {/* Notifications list */}
          <div className="overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FiBell className="mx-auto h-8 w-8 mb-2" />
                <p>No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {notifications.map(notification => (
                  <li 
                    key={notification.id} 
                    className={`hover:bg-gray-50 cursor-pointer relative ${!notification.isRead ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex p-4">
                      <div className="mr-4 flex-shrink-0 self-center">
                        {getNotificationIcon(notification.message)}
                      </div>
                      <div className="flex-grow pr-8">
                        <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => deleteNotification(notification.id, e)} 
                        className="absolute right-3 top-3 p-1 hover:bg-gray-200 rounded-full"
                      >
                        <FiTrash size={14} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationComponent; 