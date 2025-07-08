import React, { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';

const UnreadBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Function to fetch unread count
    const fetchUnreadCount = async () => {
      try {
        const count = await chatService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Set up interval to periodically check for new messages
    const intervalId = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  if (unreadCount === 0) return null;

  return (
    <div className="bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </div>
  );
};

export default UnreadBadge; 