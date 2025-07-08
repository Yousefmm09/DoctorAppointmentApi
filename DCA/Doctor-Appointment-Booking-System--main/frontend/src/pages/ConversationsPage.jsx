import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/api';
import { toast } from 'react-toastify';
import ProfilePicture from '../components/ProfilePicture';

const ConversationsPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        // Get user role from localStorage
        const storedUserRole = localStorage.getItem('userRole');
        setUserRole(storedUserRole === 'Doctor' ? 'doctor' : 'patient');
        
        // Fetch conversations and unread count
        const [conversationsResponse, unreadCountResponse] = await Promise.all([
          chatService.getConversations(),
          chatService.getUnreadCount()
        ]);
        
        console.log('Conversations:', conversationsResponse);
        console.log('Unread count:', unreadCountResponse);
        
        setConversations(conversationsResponse?.data || []);
        setUnreadCount(unreadCountResponse?.data?.unreadCount || 0);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, []);

  const handleContactClick = (contactId) => {
    navigate(`/${userRole}/chat/${contactId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-white px-6 py-4 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
          <p className="text-gray-600 mt-1">
            Your conversations 
            {unreadCount > 0 && (
              <span className="ml-2">
                (<span className="text-blue-600 font-medium">{unreadCount} unread</span>)
              </span>
            )}
          </p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center">
              <div className="bg-blue-50 p-6 rounded-lg inline-block mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">No conversations yet</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                {userRole === 'patient' 
                  ? "Start a conversation by contacting a doctor from the doctors list." 
                  : "Start a conversation by contacting one of your patients."}
              </p>
              <button
                onClick={() => navigate(userRole === 'patient' ? '/patient/contacts' : '/doctor/contacts')}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {userRole === 'patient' ? 'Find a doctor' : 'Contact a patient'}
              </button>
            </div>
          ) : (
            <div>
              {conversations.map((conversation, index) => {
                // Map API conversation response to the UI format
                const contact = {
                  id: conversation.contactId,
                  name: conversation.contactName || 'Contact',
                  lastMessage: conversation.lastMessage || 'Start a conversation...',
                  unread: conversation.unreadCount || 0,
                  timestamp: conversation.lastMessageTime || new Date().toISOString(),
                  type: conversation.conversationType || (userRole === 'doctor' ? 'patient' : 'doctor'), // 'doctor' or 'patient'
                  profilePicture: conversation.contactProfilePicture
                };
                
                return (
                  <div 
                    key={contact.id}
                    onClick={() => handleContactClick(contact.id)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <ProfilePicture
                        imageUrl={contact.profilePicture}
                        type={contact.type?.toLowerCase() || (userRole === 'doctor' ? 'patient' : 'doctor')}
                        className="w-12 h-12"
                        name={contact.name}
                        doctorId={contact.type?.toLowerCase() === 'doctor' ? contact.id : null}
                        patientId={contact.type?.toLowerCase() === 'patient' ? contact.id : null}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <h3 className="text-lg font-semibold text-gray-800 truncate">
                            {contact.name}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {new Date(contact.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center mt-1">
                          <p className="text-sm text-gray-600 truncate flex-1">
                            {contact.lastMessage}
                          </p>
                          {contact.unread > 0 && (
                            <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {contact.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage; 