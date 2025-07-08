import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  FiCheckSquare, 
  FiCalendar, 
  FiCheckCircle, 
  FiUserPlus,
  FiClock, 
  FiAlertTriangle,
  FiXCircle,
  FiBarChart2,
  FiRefreshCw,
  FiUser,
  FiFilter,
  FiChevronRight,
  FiMessageSquare,
  FiSettings,
  FiTrendingUp,
  FiClipboard,
  FiMapPin,
  FiInfo,
  FiStar,
  FiPlus,
  FiArchive,
  FiVideo,
  FiZap,
  FiBell
} from 'react-icons/fi';
import ProfilePicture from '../../components/ProfilePicture';

// Import services
import { doctorService, appointmentService } from '../../services/api';

// Import context
import { DoctorContext } from '../../context/DoctorContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
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

// Custom hook for fetching doctor dashboard data
const useDoctorDashboard = (token, doctorProfile) => {
  const [dashboard, setDashboard] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    cancelledAppointments: 0,
    upcomingAppointments: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchDashboardData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get doctor ID from profile or localStorage
      const doctorId = doctorProfile?.id || localStorage.getItem("doctorId");
      
      if (!doctorId) {
        throw new Error("Doctor ID not found. Please complete your profile first.");
      }
      
      // Fetch dashboard stats using service
      try {
        const dashboardResponse = await doctorService.getDoctorDashboardData(doctorId);
        
        if (dashboardResponse.data) {
          // Map the backend property names to our frontend property names
          const dashboardData = {
            totalAppointments: dashboardResponse.data.totalAppointments || 0,
            todayAppointments: dashboardResponse.data.todaysAppointments || 0,
            completedAppointments: dashboardResponse.data.completedAppointments || 0,
            pendingAppointments: 0,
            cancelledAppointments: 0,
            upcomingAppointments: 0
          };
          
          setDashboard(dashboardData);
          
          // If we have a latest appointment, add it to the appointments array
          if (dashboardResponse.data.latestAppointment) {
            const latestAppointment = {
              id: dashboardResponse.data.latestAppointment.id,
              patientName: dashboardResponse.data.latestAppointment.patientName,
              appointmentDate: dashboardResponse.data.latestAppointment.appointmentDate,
              appointmentTime: dashboardResponse.data.latestAppointment.startTime,
              status: dashboardResponse.data.latestAppointment.status,
              reason: "General checkup"
            };
            
            setAppointments([latestAppointment]);
          }
        }
      } catch (dashboardErr) {
        console.warn("Could not fetch dashboard data:", dashboardErr);
        // Will fallback to calculating from appointments below
      }
      
      // Fetch appointments using service
      try {
        const appointmentsResponse = await doctorService.getDoctorAppointments(doctorId);
        
        if (appointmentsResponse.data) {
          // Process and normalize appointments data
          const appointmentsData = Array.isArray(appointmentsResponse.data) ? 
            appointmentsResponse.data : [];
            
          // Sort by date (most recent first)
          appointmentsData.sort((a, b) => {
            const dateA = new Date(a.appointmentDate || a.date);
            const dateB = new Date(b.appointmentDate || b.date);
            return dateB - dateA;
          });
          
          // Transform appointment data to match our component's expected format
          const formattedAppointments = appointmentsData.map(apt => ({
            id: apt.id,
            patientName: apt.patientName,
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.startTime ? `${apt.startTime.substring(0, 5)}` : 'N/A',
            status: apt.status,
            reason: apt.reason || 'General checkup'
          }));
          
          // Filter to get only the latest 5 appointments
          const latestAppointments = formattedAppointments.slice(0, 5);
          setAppointments(latestAppointments);
          
          // Calculate additional stats from appointments data
          const today = new Date().toISOString().split('T')[0];
          
          // Update dashboard with additional calculated stats
          setDashboard(prev => ({
            ...prev,
            pendingAppointments: appointmentsData.filter(a => 
              a.status === 'Pending'
            ).length,
            cancelledAppointments: appointmentsData.filter(a => 
              a.status === 'Cancelled'
            ).length,
            upcomingAppointments: appointmentsData.filter(a => 
              ['Pending', 'Confirmed'].includes(a.status)
            ).length
          }));
        }
      } catch (appointmentsErr) {
        console.error("Error fetching appointments:", appointmentsErr);
        // Will use fallback below
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
      
      // Generate example data if no data is available
      setDashboard({
        totalAppointments: 25,
        todayAppointments: 4,
        completedAppointments: 12,
        pendingAppointments: 8,
        cancelledAppointments: 5,
        upcomingAppointments: 13
      });
      
      // Generate example appointments if none available
      if (appointments.length === 0) {
        setAppointments(generateExampleAppointments());
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Generate example appointments when backend is unavailable
  const generateExampleAppointments = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return [
      {
        id: 'example-1',
        patientName: 'Ahmed Mohamed',
        appointmentDate: today.toISOString().split('T')[0],
        status: 'Confirmed',
        appointmentTime: '10:00 AM',
        patientPhoneNumber: '+201234567890',
        reason: 'General checkup',
        isExample: true
      },
      {
        id: 'example-2',
        patientName: 'Sara Ibrahim',
        appointmentDate: today.toISOString().split('T')[0],
        status: 'Pending',
        appointmentTime: '2:00 PM',
        patientPhoneNumber: '+201234567891',
        reason: 'Follow-up',
        isExample: true
      },
      {
        id: 'example-3',
        patientName: 'Mohammed Ali',
        appointmentDate: tomorrow.toISOString().split('T')[0],
        status: 'Confirmed',
        appointmentTime: '11:30 AM',
        patientPhoneNumber: '+201234567892',
        reason: 'Consultation',
        isExample: true
      }
    ];
  };
  
  // Update appointment status
  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      // Optimistically update the UI
      const updatedAppointments = appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      );
      setAppointments(updatedAppointments);
      
      // Update dashboard counts
      const oldStatus = appointments.find(apt => apt.id === appointmentId)?.status;
      if (oldStatus && newStatus) {
        setDashboard(prev => {
          const newDashboard = { ...prev };
          
          // Decrement the old status count
          if (oldStatus === 'Pending') newDashboard.pendingAppointments--;
          else if (oldStatus === 'Confirmed') newDashboard.upcomingAppointments--;
          else if (oldStatus === 'Cancelled') newDashboard.cancelledAppointments--;
          else if (oldStatus === 'Completed') newDashboard.completedAppointments--;
          
          // Increment the new status count
          if (newStatus === 'Pending') newDashboard.pendingAppointments++;
          else if (newStatus === 'Confirmed') newDashboard.upcomingAppointments++;
          else if (newStatus === 'Cancelled') newDashboard.cancelledAppointments++;
          else if (newStatus === 'Completed') newDashboard.completedAppointments++;
          
          return newDashboard;
        });
      }
      
      // Make API request using service
      if (!appointmentId.startsWith('example')) {
        await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      } else {
        // This is example data, don't make an API call
        console.log('Not making API call for example data:', appointmentId);
      }
      
      toast.success(`Appointment marked as ${newStatus}`);
      return true;
    } catch (err) {
      console.error("Error updating appointment status:", err);
      toast.error("Failed to update appointment status");
      return false;
    }
  };
  
  // Load dashboard data on mount
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, doctorProfile]);
  
  return {
    dashboard,
    appointments,
    loading,
    error,
    isRefreshing,
    fetchDashboardData,
    updateAppointmentStatus
  };
};

// Dashboard statistics card component
const StatCard = ({ icon, title, value, description, color, increase }) => {
  return (
    <motion.div 
      variants={itemVariants}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-gray-200 transition-all hover:shadow"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start">
        <div className={`rounded-lg p-3 ${color}`}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {increase && (
              <span className="ml-2 text-xs font-medium text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                +{increase}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Appointment card component
const AppointmentCard = ({ appointment, onStatusUpdate }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate.getTime() === today.getTime()) {
        return "Today";
      }
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      if (appointmentDate.getTime() === tomorrow.getTime()) {
        return "Tomorrow";
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "No date";
    }
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return "No time";
    
    // Handle different time formats
    if (typeof timeString === 'string') {
      // If it's already formatted like "10:00 AM"
      if (timeString.includes('AM') || timeString.includes('PM')) {
        return timeString;
      }
      
      // If it's in 24-hour format like "10:00" or "10:00:00"
      const timeParts = timeString.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      }
    }
    
    return timeString;
  };
  
  const getStatusClass = (status) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    
    switch (normalizedStatus) {
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      case 'pending':
      default:
        return 'bg-yellow-50 text-yellow-700';
    }
  };

  return (
    <motion.div 
      variants={itemVariants}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusClass(appointment.status)}`}>
          {appointment.status || "Pending"}
        </span>
        <span className="text-xs text-gray-500">
          {formatDate(appointment.appointmentDate)}
        </span>
      </div>
      
      <div className="flex items-start">
        <ProfilePicture
          type="patient"
          name={appointment.patientName || "Patient"}
          size="md"
          className="flex-shrink-0"
        />
        <div className="ml-3 flex-1">
          <h4 className="font-medium text-gray-800">{appointment.patientName || "Patient"}</h4>
          <p className="text-xs text-gray-500 mb-2">
            {appointment.patientPhoneNumber || "No phone"}
          </p>
          
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <FiClock className="mr-1.5 text-gray-400" />
            {formatTime(appointment.appointmentTime || appointment.startTime)}
          </div>
          
          <div className="flex items-center text-xs text-gray-600">
            <FiClipboard className="mr-1.5 text-gray-400" />
            {appointment.reason || "General checkup"}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
          {appointment.status === 'Pending' && (
            <>
              <button
                onClick={() => onStatusUpdate(appointment.id, 'Confirmed')}
                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 px-3 rounded-lg transition-colors"
              >
              <FiCheckCircle className="inline-block mr-1" /> Confirm
              </button>
              <button
                onClick={() => onStatusUpdate(appointment.id, 'Cancelled')}
                className="text-xs bg-red-50 text-red-600 hover:bg-red-100 py-1.5 px-3 rounded-lg transition-colors"
              >
              <FiXCircle className="inline-block mr-1" /> Cancel
              </button>
            </>
          )}
          {appointment.status === 'Confirmed' && (
            <button
              onClick={() => onStatusUpdate(appointment.id, 'Completed')}
            className="text-xs bg-green-50 text-green-600 hover:bg-green-100 py-1.5 px-3 rounded-lg transition-colors ml-auto"
            >
            <FiCheckCircle className="inline-block mr-1" /> Mark Completed
            </button>
          )}
        <Link 
          to={`/doctor/appointment/${appointment.id}`}
          className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 py-1.5 px-3 rounded-lg transition-colors"
        >
          <FiChevronRight className="inline-block mr-1" /> Details
        </Link>
        </div>
    </motion.div>
  );
};

// Loading skeleton for appointment cards
const AppointmentSkeleton = () => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
      <div className="h-4 w-16 bg-gray-200 rounded"></div>
    </div>
    
    <div className="flex items-start">
      <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
      <div className="ml-3 flex-1">
        <div className="h-5 w-36 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
        
        <div className="h-4 w-28 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
    
    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
      <div className="h-8 w-20 bg-gray-200 rounded"></div>
      <div className="h-8 w-20 bg-gray-200 rounded"></div>
    </div>
    </div>
  );

// Quick Action Card component
const QuickActionCard = ({ icon, title, description, linkTo, color }) => (
  <motion.div
    variants={itemVariants}
    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 group"
    whileHover={{ y: -5 }}
  >
    <div className={`h-1.5 w-full ${color}`}></div>
    <div className="p-6">
      <div className={`bg-${color.replace('bg-', '')}50 p-4 rounded-full inline-flex mb-4`}>
        {icon}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      
      <Link
        to={linkTo}
        className={`flex items-center font-medium ${color.replace('bg-', 'text-')} hover:underline`}
      >
        Open <FiChevronRight className="ml-1" />
      </Link>
    </div>
  </motion.div>
);

const DoctorDashboard = () => {
  const { 
    token,
    doctorProfile,
    isAuthenticated
  } = useContext(DoctorContext);

  const navigate = useNavigate();

  // Use custom hook for dashboard data
  const {
    dashboard,
    appointments,
    loading,
    error,
    isRefreshing,
    fetchDashboardData,
    updateAppointmentStatus
  } = useDoctorDashboard(token, doctorProfile);
            
  // Handle manual refresh
  const handleRefresh = () => {
    fetchDashboardData(true);
  };
        
  // Handle appointment status update
  const handleStatusUpdate = async (appointmentId, status) => {
      const success = await updateAppointmentStatus(appointmentId, status);
      if (success) {
      toast.success(`Appointment marked as ${status}`);
    }
  };
  
  // Error display component
  const ErrorDisplay = ({ message, onRetry }) => (
    <div className="rounded-xl bg-red-50 border border-red-100 p-6 my-4">
      <div className="flex items-center mb-4">
        <FiAlertTriangle className="text-red-500 mr-3 text-xl" />
        <h3 className="text-lg font-medium text-red-700">Unable to load dashboard</h3>
        </div>
      <p className="text-red-600 mb-4">{message || "There was a problem connecting to the server."}</p>
      <div className="flex justify-end">
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <span className="animate-spin mr-2">⟳</span> Retrying...
            </>
          ) : (
            <>
              <FiRefreshCw className="mr-2" /> Retry
            </>
          )}
        </button>
      </div>
      </div>
    );

  return (
    <motion.div
      className="max-w-6xl mx-auto py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Welcome Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, Dr. {doctorProfile?.firstName || 'Doctor'}
            </h1>
          <p className="text-gray-600">
              Here's what's happening with your appointments today
            </p>
          </div>
          
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center px-3 py-2 text-sm bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <span className="animate-spin mr-2">⟳</span>
            ) : (
              <FiRefreshCw className="mr-2" />
            )}
            Refresh
          </button>
          
          <Link
            to="/doctor/appointments"
            className="inline-flex items-center justify-center px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiCalendar className="mr-2" /> All Appointments
          </Link>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <ErrorDisplay message={error} onRetry={handleRefresh} />
      )}
      
      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <StatCard 
          icon={<FiCheckSquare className="h-6 w-6 text-blue-600" />}
          title="Total Appointments"
          value={dashboard.totalAppointments || 0}
          description="All time appointments"
          color="bg-blue-50"
        />
        
        <StatCard 
          icon={<FiCalendar className="h-6 w-6 text-purple-600" />}
          title="Today's Appointments"
          value={dashboard.todayAppointments || 0}
          description="Appointments scheduled for today"
          color="bg-purple-50"
        />
        
        <StatCard 
          icon={<FiUserPlus className="h-6 w-6 text-yellow-600" />}
          title="Pending Appointments"
          value={dashboard.pendingAppointments || 0}
          description="Waiting for confirmation"
          color="bg-yellow-50"
        />
        
        <StatCard 
          icon={<FiCheckCircle className="h-6 w-6 text-green-600" />}
          title="Completed Appointments"
          value={dashboard.completedAppointments || 0}
          description="Successfully completed"
          color="bg-green-50"
        />
      </motion.div>
      
      {/* Latest Appointments and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Appointments */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiClock className="mr-2 text-blue-600" /> Latest Appointments
              </h2>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <AppointmentSkeleton key={i} />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                <FiCalendar className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No appointments yet</h3>
              <p className="text-gray-600 mb-6">
                You don't have any appointments scheduled at the moment.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {appointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              
              {appointments.length > 0 && (
                <div className="text-center pt-2">
                <Link 
                    to="/doctor/appointments"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    View all appointments <FiChevronRight className="ml-1" />
                </Link>
              </div>
            )}
            </motion.div>
          )}
        </div>
        
          {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiZap className="mr-2 text-blue-600" /> Quick Actions
            </h2>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <QuickActionCard
              icon={<FiCalendar className="h-6 w-6 text-blue-600" />}
              title="Manage Schedule"
              description="Update your availability and working hours"
              linkTo="/doctor/availability"
              color="bg-blue-500"
            />
            
            <QuickActionCard
              icon={<FiMessageSquare className="h-6 w-6 text-green-600" />}
              title="Patient Messages"
              description="Respond to patient inquiries and questions"
              linkTo="/doctor/messages"
              color="bg-green-500"
            />
            
            <QuickActionCard
              icon={<FiUser className="h-6 w-6 text-purple-600" />}
              title="Update Profile"
              description="Manage your professional profile information"
              linkTo="/doctor/profile"
              color="bg-purple-500"
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DoctorDashboard;
