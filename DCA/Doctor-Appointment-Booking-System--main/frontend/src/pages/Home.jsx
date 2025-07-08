import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { PatientContext } from '../context/PatientContext';
import { motion } from 'framer-motion';
import { FiCalendar, FiUserPlus, FiUser, FiClipboard, FiMessageCircle, FiStar, FiArrowRight, FiHome, FiFileText, FiAward, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import UpcomingAppointmentCard from '../components/UpcomingAppointmentCard';
import axios from 'axios';

// Custom hook for fetching appointments
const useAppointments = (token, userData) => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [stats, setStats] = useState({ appointments: 0, completedAppointments: 0, favoriteDoctor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!token || !userData) {
        // Set example data for non-authenticated users
        setExampleData();
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Get user ID (which could be a GUID) and check for a numeric patient ID
        const userId = userData.id || localStorage.getItem('userId');
        let patientId = localStorage.getItem('patientId');
        
        // If we don't have a numeric patientId, try to get it from the API
        if (!patientId && userId) {
          try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
            const userResponse = await axios.get(`${baseUrl}/api/Patient/by-user-id/${userId}`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000
            });
            
            if (userResponse.data && userResponse.data.id) {
              patientId = userResponse.data.id;
              // Store the patientId for future use
              localStorage.setItem('patientId', patientId);
              console.log(`Retrieved patient ID: ${patientId} for user ID: ${userId}`);
            }
          } catch (userError) {
            console.error('Error fetching patient ID:', userError);
          }
        }
        
        if (!patientId) {
          console.error('No patient ID found');
          setExampleData();
          return;
        }
        
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
        const endpoint = `${baseUrl}/api/Patient/appointments/${patientId}`;
        
        console.log(`Fetching appointments from: ${endpoint}`);
        
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000 // Increase timeout for better reliability
          });
          
          let appointmentsData = [];
          
          if (response.data) {
            appointmentsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
            console.log('Appointments data received:', appointmentsData);
            
            if (appointmentsData.length > 0) {
              processAppointmentData(appointmentsData);
            } else {
              setExampleData();
            }
          } else {
            setExampleData();
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // Handle specific errors
          if (apiError.response && apiError.response.status === 404) {
            console.warn('Appointment endpoint not found. Showing example data.');
          } else {
            setError(apiError.message || 'Failed to load appointments');
          }
          
          // Always show example data on error for better user experience
          setExampleData();
        }
      } catch (err) {
        console.error('Error in appointment fetching process:', err);
        setError(err.message || 'Failed to load appointments');
        setExampleData();
      } finally {
        setLoading(false);
      }
    };
    
    const processAppointmentData = (data) => {
      setAppointments(data);
      
      // Filter for upcoming appointments
      const upcoming = data.filter(apt => {
        const status = ((apt.status || '') + '').toLowerCase();
            return status !== 'cancelled' && status !== 'completed';
          });
          
      // Sort by date
          upcoming.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
          
      // Get next upcoming appointment
          if (upcoming.length > 0) {
            const next = upcoming[0];
            setUpcomingAppointment({
              id: next.id,
          doctorName: next.doctorName || 'Dr. Unknown',
              specialty: next.specialization || 'General',
          date: next.appointmentDate || new Date().toISOString().split('T')[0],
          time: next.startTime || '10:00 AM',
          isExample: false
            });
          } else {
        setExampleData();
          }
          
          // Set stats
          setStats({
        appointments: data.length,
        completedAppointments: data.filter(apt => 
              apt.status && apt.status.toLowerCase() === 'completed'
            ).length,
        favoriteDoctor: data.length > 0 ? {
          name: data[0].doctorName || 'Dr. Unknown',
          specialty: data[0].specialization || 'General'
        } : null
      });
    };
    
    const setExampleData = () => {
      const mockAppointments = [
        {
          id: '12345',
          doctorId: '1',
          doctorName: 'Dr. James Carter',
          patientId: userData?.id || '123',
          specialization: 'General',
          appointmentDate: '2023-06-22',
          startTime: '10:30 AM',
          endTime: '11:00 AM',
          status: 'scheduled',
          notes: '',
          isExample: true
        },
        {
          id: '12346',
          doctorId: '2',
          doctorName: 'Dr. Sarah Johnson',
          patientId: userData?.id || '123',
          specialization: 'Cardiology',
          appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startTime: '2:00 PM',
          endTime: '2:30 PM',
          status: 'scheduled',
          notes: '',
          isExample: true
        }
      ];
      
      setAppointments(mockAppointments);
      setUpcomingAppointment({
        id: mockAppointments[0].id,
        doctorName: mockAppointments[0].doctorName,
        specialty: mockAppointments[0].specialization,
        date: mockAppointments[0].appointmentDate,
        time: mockAppointments[0].startTime,
        isExample: true
      });
      
      setStats({
        appointments: mockAppointments.length,
        completedAppointments: 0,
            favoriteDoctor: {
              name: 'Dr. James Carter',
              specialty: 'General'
            }
          });
    };
    
    fetchAppointments();
  }, [token, userData]);
  
  const refetchAppointments = () => {
    setLoading(true);
    // This will trigger the useEffect to run again
    // Adding a small delay to make the loading state visible to user
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };
  
  return { appointments, upcomingAppointment, stats, loading, error, refetchAppointments };
};

const Home = () => {
  const navigate = useNavigate();
  const { userData, token } = useContext(AppContext);
  const { patientProfile } = useContext(PatientContext);
  const [timeOfDay, setTimeOfDay] = useState('');
  
  // Use our custom hook for appointments
  const { 
    upcomingAppointment, 
    stats, 
    loading, 
    error, 
    refetchAppointments 
  } = useAppointments(token, userData);

  // Get time of day for greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('morning');
    else if (hour < 18) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  }, []);

  // Name display with fallback logic
  const patientName = patientProfile?.firstName || userData?.firstName || userData?.name || '';
  const firstName = patientName.split(' ')[0]; // Just get the first name for friendlier greeting

  // Animation variants (simplified for better performance)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  // Error UI component
  const ErrorDisplay = ({ message, onRetry }) => (
    <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <FiAlertCircle className="text-red-500 mr-3 text-xl" />
        <p className="text-red-600 font-medium">{message || "Couldn't load your appointments"}</p>
      </div>
      <button 
        onClick={onRetry}
        className="px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors flex items-center"
      >
        <FiRefreshCw className="mr-1" /> Retry
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section - More efficient animations */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white pt-20 pb-32 px-6 shadow-md relative overflow-hidden">
        {/* Abstract shapes with reduced animation complexity */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <motion.div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white opacity-10"
            animate={{ 
              x: [0, 10, 0],
              y: [0, -10, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 20,
              ease: "easeInOut"
            }}
          ></motion.div>
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white opacity-5"></div>
          <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full bg-white opacity-5"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-600 opacity-20"></div>
        </div>
        
        <motion.div 
          className="max-w-5xl mx-auto z-10 relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-blue-100 uppercase tracking-wider text-sm font-medium mb-2">
            <span className="inline-flex items-center">
              <FiHome className="mr-2" /> Patient Dashboard
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 flex flex-wrap items-center gap-2">
            Good {timeOfDay}
            {firstName && (
              <span className="bg-blue-400 bg-opacity-20 py-1 px-4 rounded-full">
                {firstName}
              </span>
            )}
          </h1>
          
          <p className="text-xl mb-10 text-blue-50 max-w-2xl leading-relaxed">
            Welcome to your health dashboard. Find doctors, book appointments, and manage your healthcare journey all in one place.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <motion.button 
              onClick={() => navigate('/doctors')}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 flex items-center"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiUserPlus className="mr-2" />
              Find Doctors
            </motion.button>
            
            <motion.button 
              onClick={() => navigate('/my-appointments')}
              className="bg-blue-700 bg-opacity-30 text-white border border-white border-opacity-30 px-6 py-3 rounded-lg font-medium hover:bg-opacity-40 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 backdrop-blur-sm flex items-center"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiCalendar className="mr-2" />
              My Appointments
            </motion.button>
          </div>
        </motion.div>
      </div>
      
      {/* Upcoming Appointment Card - Improved loading states */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-20">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <UpcomingAppointmentCard 
            appointment={upcomingAppointment} 
            loading={loading} 
            showActions={true} 
          />
        </motion.div>
      </div>

      {/* Health Dashboard - Optimized rendering */}
      <motion.div 
        className="max-w-5xl mx-auto py-12 px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stats Cards - With loading skeletons */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          variants={containerVariants}
        >
          <motion.div 
            className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 p-6"
            variants={itemVariants}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Appointments</p>
                {loading ? (
                  <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
                ) : (
                <h3 className="text-3xl font-bold text-slate-900">{stats.appointments}</h3>
                )}
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FiClipboard className="text-blue-600 text-xl" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex gap-2 items-center text-slate-600 text-sm">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                {loading ? (
                  <div className="h-4 w-24 bg-slate-200 animate-pulse rounded"></div>
                ) : (
                <span>{stats.completedAppointments} completed</span>
                )}
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full mt-2">
                {loading ? (
                  <div className="h-3 w-1/3 bg-slate-200 animate-pulse rounded-full"></div>
                ) : (
                <motion.div 
                  className="h-3 bg-blue-500 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.completedAppointments / Math.max(stats.appointments, 1)) * 100}%` }}
                    transition={{ duration: 0.7 }}
                ></motion.div>
                )}
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 p-6"
            variants={itemVariants}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">My Health Profile</p>
                <h3 className="text-xl font-bold text-slate-900">Personal Details</h3>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FiUser className="text-indigo-600 text-xl" />
              </div>
            </div>
            <div className="mt-4">
              <motion.button
                onClick={() => navigate('/my-profile')}
                className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors duration-300 flex items-center justify-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Update Profile <FiArrowRight className="ml-2" />
              </motion.button>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 p-6"
            variants={itemVariants}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Messages</p>
                <h3 className="text-xl font-bold text-slate-900">Chat with doctors</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FiMessageCircle className="text-green-600 text-xl" />
              </div>
            </div>
            <div className="mt-4">
              <motion.button
                onClick={() => navigate('/patient/messages')}
                className="w-full py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors duration-300 flex items-center justify-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Messages <FiArrowRight className="ml-2" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions Section - With better spacing and touch targets */}
        <motion.div variants={containerVariants}>
          <motion.h2 
            className="text-2xl font-semibold text-slate-800 mb-6 pl-4 border-l-4 border-blue-500"
            variants={itemVariants}
          >
            Quick Actions
          </motion.h2>
          
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" variants={containerVariants}>
            {/* Book Appointment Card */}
            <motion.div 
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 group"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <div className="p-6">
                <div className="bg-blue-50 p-4 rounded-full inline-flex mb-4 group-hover:bg-blue-100 transition-colors">
                  <FiUserPlus className="h-6 w-6 text-blue-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Book Appointment</h3>
                <p className="text-slate-600 mb-4">Find specialist doctors and schedule your next appointment.</p>
                
                <motion.button
                  onClick={() => navigate('/doctors')}
                  className="flex items-center font-medium text-blue-600 hover:text-blue-700 transition-colors group-hover:underline"
                  whileHover={{ x: 5 }}
                >
                  Find Doctors <FiArrowRight className="ml-2" />
                </motion.button>
              </div>
            </motion.div>
            
            {/* My Appointments Card */}
            <motion.div 
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 group"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
              <div className="p-6">
                <div className="bg-purple-50 p-4 rounded-full inline-flex mb-4 group-hover:bg-purple-100 transition-colors">
                  <FiCalendar className="h-6 w-6 text-purple-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-slate-800 mb-2">My Appointments</h3>
                <p className="text-slate-600 mb-4">View and manage your upcoming and past appointments.</p>
                
                <motion.button
                  onClick={() => navigate('/my-appointments')}
                  className="flex items-center font-medium text-purple-600 hover:text-purple-700 transition-colors group-hover:underline"
                  whileHover={{ x: 5 }}
                >
                  Manage Appointments <FiArrowRight className="ml-2" />
                </motion.button>
              </div>
            </motion.div>

            {/* Rate Doctors Card */}
            <motion.div 
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 group"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
              <div className="p-6">
                <div className="bg-yellow-50 p-4 rounded-full inline-flex mb-4 group-hover:bg-yellow-100 transition-colors">
                  <FiStar className="h-6 w-6 text-yellow-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Rate Doctors</h3>
                <p className="text-slate-600 mb-4">Share your experience and help others find great doctors.</p>
                
                <motion.button
                  onClick={() => navigate('/my-doctor-ratings')}
                  className="flex items-center font-medium text-yellow-600 hover:text-yellow-700 transition-colors group-hover:underline"
                  whileHover={{ x: 5 }}
                >
                  Rate Your Doctors <FiArrowRight className="ml-2" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        
        {/* Health Resources Section - Simplified animation */}
        <motion.div 
          className="mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.h2 
            className="text-2xl font-semibold text-slate-800 mb-6 pl-4 border-l-4 border-green-500"
          >
            Health Resources
          </motion.h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <div className="bg-green-50 p-3 rounded-lg mr-4">
                  <FiFileText className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Medical Articles</h3>
                  <p className="text-slate-600 mb-3">Stay informed with the latest health tips and medical information.</p>
                  <a href="#" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                    Read Articles <FiArrowRight className="ml-2" />
                  </a>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-50 p-3 rounded-lg mr-4">
                  <FiAward className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Health Tips</h3>
                  <p className="text-slate-600 mb-3">Discover professional advice for maintaining your wellbeing.</p>
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                    View Tips <FiArrowRight className="ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;

