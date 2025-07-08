import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChatPage from '../ChatPage';
import { toast } from 'react-toastify';
import { FiMessageCircle, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { doctorService } from '../../services/api';

const PatientChatPage = () => {
  const [patientId, setPatientId] = useState(null);
  const [recipientDoctorId, setRecipientDoctorId] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const { recipientId } = useParams();
  
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get patient ID from user context or localStorage
        let userId = localStorage.getItem('userId');
        const storedUserRole = localStorage.getItem('userRole');
        setUserRole(storedUserRole); // Store the exact user role from localStorage
        
        let storedPatientId = localStorage.getItem('patientId');
        
        // Check for userData in localStorage if userId is not found
        if (!userId || !storedPatientId) {
          try {
            const userDataStr = localStorage.getItem('userData');
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              if (userData) {
                // Extract user ID if available
                if (userData.id || userData.userId) {
                  userId = userData.id || userData.userId;
                  // Store userId in localStorage for future use
                  localStorage.setItem('userId', userId);
                  console.log('Extracted and stored userId from userData:', userId);
                }
                
                // Extract patient ID if available
                if (userData.patientId) {
                  storedPatientId = userData.patientId;
                  localStorage.setItem('patientId', storedPatientId);
                  console.log('Extracted and stored patientId from userData:', storedPatientId);
                }
              }
            }
          } catch (error) {
            console.error('Error parsing userData:', error);
            setError('Could not retrieve user data. Please try logging in again.');
            return;
          }
        }
        
        // If we still don't have a patient ID, try to use userId as a fallback
        if (!storedPatientId && userId) {
          console.log('No patientId found, using userId as fallback:', userId);
          storedPatientId = userId;
          localStorage.setItem('patientId', storedPatientId);
        }
        
        console.log('Patient Chat Page - IDs:', {
          userId,
          storedPatientId,
          userRole: storedUserRole,
          recipientId
        });
        
        if (storedPatientId) {
          // Use case-insensitive comparison for role check
          if (storedUserRole && storedUserRole.toUpperCase() === 'PATIENT') {
            // Set the patient ID - use patientId from storage
            const resolvedPatientId = parseInt(storedPatientId, 10);
            
            // Validate the patient ID
            if (isNaN(resolvedPatientId) || resolvedPatientId <= 0) {
              setError('Invalid patient ID. Please log in again.');
              toast.error('Invalid patient ID. Please log in again.');
              setTimeout(() => navigate('/login'), 1500);
              return;
            }
            
            setPatientId(resolvedPatientId);
            
            // Save patientId to localStorage for future use
            localStorage.setItem('patientId', resolvedPatientId.toString());
            
            // Parse and set the recipient doctor ID
            if (recipientId) {
              const parsedDoctorId = parseInt(recipientId, 10);
              
              // Validate the doctor ID
              if (isNaN(parsedDoctorId) || parsedDoctorId <= 0) {
                setError('Invalid doctor ID. Please select a valid doctor.');
                return;
              }
              
              setRecipientDoctorId(parsedDoctorId);
              console.log('Set recipient doctor ID:', parsedDoctorId);
              
              // Fetch doctor information for display
              try {
                const doctorResponse = await doctorService.getDoctorById(parsedDoctorId);
                if (doctorResponse && doctorResponse.data) {
                  setDoctorInfo(doctorResponse.data);
                }
              } catch (doctorError) {
                console.error('Error fetching doctor info:', doctorError);
                // We'll continue even if doctor info fetch fails
              }
            } else {
              setError('No doctor selected. Please choose a doctor to chat with.');
            }
          } else {
            // If user is not a patient, redirect to appropriate chat page
            if (storedUserRole && storedUserRole.toUpperCase() === 'DOCTOR') {
              navigate(`/doctor/chat/${recipientId || ''}`);
            } else {
              setError('Access denied. You must be logged in as a patient.');
              toast.error('Access denied. You must be logged in as a patient.');
              setTimeout(() => navigate('/login'), 1500);
              return;
            }
          }
        } else {
          setError('Authentication required. Please log in to continue.');
          toast.error('Not logged in. Please log in to continue.');
          navigate('/login');
          return;
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Could not initialize chat. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadChatData();
  }, [navigate, recipientId]);
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4">
        <div className="rounded-full bg-red-50 p-3 mb-4">
          <FiAlertCircle className="text-red-500 text-2xl" />
        </div>
        <h2 className="text-lg font-medium text-slate-800 mb-2">Chat Error</h2>
        <p className="text-slate-500 text-center mb-4">{error}</p>
        <div className="flex space-x-3">
          <button 
            onClick={() => navigate('/patient/contacts')} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
          >
            <FiArrowLeft className="mr-2" /> Back to Contacts
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (loading || !patientId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="rounded-full bg-blue-50 p-4 mb-5">
          <div className="w-8 h-8 border-t-2 border-r-2 border-blue-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-600">
          Preparing chat interface...
        </p>
      </div>
    );
  }
  
  console.log('PatientChatPage rendering with:', {
    patientId,
    recipientDoctorId,
    userRole,
    doctorInfo
  });
  
  return (
    <div className="h-screen bg-slate-50">
      <ChatPage 
        userRole={userRole} // Use the exact role from localStorage
        userId={patientId}
        recipientType="doctor"
        recipientId={recipientDoctorId}
        recipientInfo={doctorInfo}
      />
    </div>
  );
};

export default PatientChatPage; 