import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PatientContext } from '../context/PatientContext';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiCalendar, FiClock, FiMapPin, FiUser, FiCheckCircle, FiXCircle, FiInfo, FiArrowLeft, FiEdit, FiSave, FiActivity, FiBriefcase } from 'react-icons/fi';
import { motion } from 'framer-motion';
import ProfilePicture from '../components/ProfilePicture';
import UpcomingAppointmentCard from '../components/UpcomingAppointmentCard';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, backendUrl } = useContext(AppContext);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    status: '',
    notes: ''
  });

  console.log("AppointmentDetails component initializing with ID:", id);
  
  // If id is 'details' or doesn't exist, we'll show the demo appointment for Dr. James Carter
  const isExampleAppointment = id === 'details' || !id;
  
  useEffect(() => {
    const fetchAppointment = async () => {
      if (isExampleAppointment) {
        // Just set the example appointment data and stop loading
        setTimeout(() => {
          setAppointment({
            id: 'sample-001',
            doctorName: 'Dr. James Carter',
            doctorId: 'doctor001',
            doctorSpecialization: 'General',
            patientName: 'You',
            appointmentDate: '2023-06-22',
            startTime: '10:30 AM',
            endTime: '11:00 AM',
            status: 'Confirmed',
            notes: 'Regular check-up appointment',
            location: 'Carter Medical Clinic, Suite 302',
            doctorPhone: '+1234567890',
            doctorEmail: 'dr.carter@tabebak.com'
          });
          setLoading(false);
        }, 1000);
        return;
      }
      
      // Otherwise fetch the real appointment data
      try {
        setLoading(true);
        const response = await axios.get(`${backendUrl}/api/Appointment/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Appointment data:", response.data);
        setAppointment(response.data);
        
        // Populate form data with current values
        setFormData({
          startTime: response.data.startTime || '',
          endTime: response.data.endTime || '',
          status: response.data.status || '',
          notes: response.data.notes || ''
        });
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError("Failed to load appointment details");
        toast.error("Could not load appointment details");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id, token, backendUrl, isExampleAppointment]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const url = `${backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5109"}/api/Appointment/confirm/${id}`;
      console.log("Confirming appointment with URL:", url);
      const response = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200 || response.status === 204) {
        toast.success("Appointment confirmed successfully");
        
        // Refresh appointment data
        setAppointment({...appointment, status: 'Confirmed'});
        
        // Update the appointment in localStorage cache
        try {
          const cachedAppointments = JSON.parse(localStorage.getItem('cachedAppointments') || '[]');
          const updatedCache = cachedAppointments.map(apt => 
            apt.id.toString() === id.toString() ? {...apt, status: 'Confirmed'} : apt
          );
          localStorage.setItem('cachedAppointments', JSON.stringify(updatedCache));
        } catch (e) {
          console.error("Error updating appointment cache:", e);
        }
      } else {
        toast.error("Failed to confirm appointment");
      }
    } catch (error) {
      console.error("Error confirming appointment:", error);
      toast.error("Failed to confirm appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    
    try {
      setLoading(true);
      const url = `${backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5109"}/api/Appointment/cancel/${id}`;
      const response = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200 || response.status === 204) {
        toast.success("Appointment cancelled successfully");
        
        // Update local state
        setAppointment({...appointment, status: 'Cancelled'});
        
        // Update the appointment in localStorage cache
        try {
          const cachedAppointments = JSON.parse(localStorage.getItem('cachedAppointments') || '[]');
          const updatedCache = cachedAppointments.map(apt => 
            apt.id.toString() === id.toString() ? {...apt, status: 'Cancelled'} : apt
          );
          localStorage.setItem('cachedAppointments', JSON.stringify(updatedCache));
        } catch (e) {
          console.error("Error updating appointment cache:", e);
        }
      } else {
        toast.error("Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    } finally {
      setLoading(false);
      setConfirmingCancel(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      const url = `${backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5109"}/api/Appointment/${id}`;
      console.log("Updating appointment with URL:", url, formData);
      
      const response = await axios.put(
        url,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200 || response.status === 204) {
        toast.success("Appointment updated successfully");
        
        // Update local state with the edited data
        const updatedAppointment = {
          ...appointment,
          ...formData
        };
        setAppointment(updatedAppointment);
        
        // Update the appointment in localStorage cache
        try {
          const cachedAppointments = JSON.parse(localStorage.getItem('cachedAppointments') || '[]');
          const updatedCache = cachedAppointments.map(apt => 
            apt.id.toString() === id.toString() ? {...apt, ...formData} : apt
          );
          localStorage.setItem('cachedAppointments', JSON.stringify(updatedCache));
        } catch (e) {
          console.error("Error updating appointment cache:", e);
        }
        
        // Exit editing mode
        setIsEditing(false);
      } else {
        toast.error("Failed to update appointment");
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      
      // Handle specific error messages
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        // Handle time slot availability errors (status code 400)
        if (status === 400) {
          if (errorData === "The selected time slot is not available." || 
              (typeof errorData === 'object' && errorData.message === "The selected time slot is not available.")) {
            toast.error("The selected time slot is not available. Please choose a different time.", {
              autoClose: 5000
            });
          } else if (errorData && typeof errorData === 'object' && errorData.message) {
            // Show server-provided error message if available
            toast.error(errorData.message, { autoClose: 5000 });
          } else {
            // Generic validation error
            toast.error("Invalid appointment details. Please check your inputs and try again.");
          }
        } else if (status === 404) {
          toast.error("Appointment not found. It may have been deleted or rescheduled.");
        } else if (status === 403) {
          toast.error("You don't have permission to modify this appointment.");
        } else if (status === 401) {
          toast.error("Your session has expired. Please log in again.");
          // Optionally redirect to login page
          // navigate('/login');
        } else if (status >= 500) {
          toast.error("Server error. Please try again later or contact support.");
        } else {
          // Generic error fallback
          toast.error("Failed to update appointment. Please try again.");
        }
      } else if (error.request) {
        // Network error
        toast.error("Network error. Please check your internet connection and try again.");
      } else {
        // Something else went wrong
        toast.error("An unexpected error occurred. Please try again.");
      }
      
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    
    try {
      // Clean up the date string if needed
      let cleanDateStr = dateString;
      
      // If it's already a valid ISO date or valid date string, use it directly
      const date = new Date(cleanDateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log("Invalid date in formatDate:", dateString);
        return "Invalid date";
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error, "for input:", dateString);
      return "Error formatting date";
    }
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return 'No time specified';
    
    try {
      // Check if it's in a format like "08:30:00"
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      // Otherwise try to parse as ISO date
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return timeString;
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Appointment Not Found"}
          </h1>
          <p className="text-gray-600 mb-6">We couldn't find the appointment you're looking for.</p>
          <button 
            onClick={() => {
              console.log("Navigating back to appointments list");
              navigate('/my-appointments');
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to My Appointments
          </button>
        </div>
      </div>
    );
  }

  // If this is the example appointment (id is 'details'), show a simplified view
  if (isExampleAppointment) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
        >
          <FiArrowLeft className="mr-2" />
          Back
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Appointment Details</h1>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h2 className="text-xl font-semibold flex items-center">
                <FiCalendar className="mr-2" /> 
                Upcoming Appointment with Dr. James Carter
              </h2>
              <p className="text-blue-100 mt-1">General Practitioner</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FiInfo className="mr-2 text-blue-500" /> Appointment Information
                  </h3>
                  
                  <dl className="space-y-3">
                    <div className="flex items-start">
                      <dt className="flex items-center text-gray-500 w-32">
                        <FiCalendar className="mr-2 text-blue-500" /> Date:
                      </dt>
                      <dd className="text-gray-900 font-medium">
                        June 22, 2023
                      </dd>
                    </div>
                    
                    <div className="flex items-start">
                      <dt className="flex items-center text-gray-500 w-32">
                        <FiClock className="mr-2 text-blue-500" /> Time:
                      </dt>
                      <dd className="text-gray-900 font-medium">
                        10:30 AM - 11:00 AM
                      </dd>
                    </div>
                    
                    <div className="flex items-start">
                      <dt className="flex items-center text-gray-500 w-32">
                        <FiMapPin className="mr-2 text-blue-500" /> Location:
                      </dt>
                      <dd className="text-gray-900 font-medium">
                        Carter Medical Clinic, Suite 302
                      </dd>
                    </div>
                    
                    <div className="flex items-start">
                      <dt className="flex items-center text-gray-500 w-32">
                        <FiCheckCircle className="mr-2 text-blue-500" /> Status:
                      </dt>
                      <dd className="text-gray-900 font-medium flex items-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Confirmed
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FiActivity className="mr-2 text-blue-500" /> Doctor Information
                  </h3>
                  
                  <div className="flex items-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-4">
                      <FiUser className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Dr. James Carter</h4>
                      <p className="text-gray-500 text-sm">General Practitioner</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <FiBriefcase className="mr-2 text-blue-500" />
                      <span className="text-gray-700">10+ years of experience</span>
                    </div>
                    <div className="flex items-center">
                      <FiPhone className="mr-2 text-blue-500" />
                      <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-800">+1 (234) 567-890</a>
                    </div>
                    <div className="flex items-center">
                      <FiMessageCircle className="mr-2 text-blue-500" />
                      <a href="mailto:dr.carter@tabebak.com" className="text-blue-600 hover:text-blue-800">dr.carter@tabebak.com</a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Notes
                </h3>
                <p className="text-gray-700">
                  Regular check-up appointment. Please arrive 15 minutes before your scheduled time and bring any recent test results if available.
                </p>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/my-appointments')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <FiCalendar className="mr-2" /> View All Appointments
                </button>
                
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center"
                >
                  <FiXCircle className="mr-2" /> Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Confirmation dialog for canceling */}
        {confirmingCancel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Appointment</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to cancel your appointment with Dr. James Carter on June 22, 2023?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmingCancel(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  No, Keep It
                </button>
                <button
                  onClick={() => {
                    toast.success("Appointment cancelled successfully");
                    setConfirmingCancel(false);
                    navigate('/my-appointments');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gray-50 py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => {
              console.log("Navigating back to appointments list from header");
              navigate('/my-appointments');
            }} 
            className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FiArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
          
          {/* Edit button */}
          {!isEditing && appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-auto p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Edit appointment"
            >
              <FiEdit size={20} />
            </button>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            {/* Doctor info */}
            <div className="flex items-center mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="mr-4">
                {appointment.doctorProfilePicture ? (
                  <ProfilePicture 
                    imageUrl={appointment.doctorProfilePicture} 
                    type="doctor"
                    className="w-16 h-16"
                    name={appointment.doctorName}
                  />
                ) : (
                  <div className="bg-blue-100 p-4 rounded-full">
                    <FiUser className="text-blue-600 h-6 w-6" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-xl text-gray-900">
                  Dr. {appointment.doctorName || "Doctor"}
                </h2>
                <p className="text-gray-600">{appointment.specialization || "Specialist"}</p>
              </div>
              <div className="ml-auto">
                {isEditing ? (
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium 
                    ${appointment.status?.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' : 
                    appointment.status?.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                    appointment.status?.toLowerCase() === 'completed' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'}`}>
                    {appointment.status || "Scheduled"}
                  </span>
                )}
              </div>
            </div>
            
            {/* Appointment details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700 border-b pb-2">Date & Time</h3>
                
                <div className="flex items-center">
                  <FiCalendar className="text-gray-500 mr-3 h-5 w-5" />
                  <div>
                    <div className="text-gray-800 font-medium">
                      {formatDate(appointment.appointmentDate)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <FiClock className="text-gray-500 mr-3 h-5 w-5" />
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">Start Time</label>
                          <input 
                            type="time" 
                            name="startTime" 
                            value={formData.startTime.slice(0, 5)} 
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">End Time</label>
                          <input 
                            type="time" 
                            name="endTime" 
                            value={formData.endTime?.slice(0, 5) || ''} 
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-gray-800 font-medium">
                          {formatTime(appointment.startTime || appointment.appointmentTime)}
                          {appointment.endTime && ` - ${formatTime(appointment.endTime)}`}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {!appointment.endTime && "Standard appointment duration"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <FiMapPin className="text-gray-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="text-gray-800 font-medium">
                      {appointment.location || "Medical Center"}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {appointment.address || "Please arrive 10 minutes before your appointment"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700 border-b pb-2">Appointment Information</h3>
                
                <div>
                  <div className="font-medium text-gray-700 mb-1">Reason for Visit</div>
                  <div className="bg-gray-50 p-3 rounded-lg text-gray-800">
                    {appointment.reason || "General checkup"}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700 mb-1">Additional Notes</div>
                  {isEditing ? (
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add notes about this appointment"
                    ></textarea>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg text-gray-800">
                      {appointment.notes || "No additional notes"}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="border-t border-gray-200 pt-6 flex justify-between">
              <button
                onClick={() => {
                  console.log("Navigating back to appointments list from footer");
                  navigate('/my-appointments');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
              >
                <FiArrowLeft className="mr-2" /> Back to List
              </button>
              
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <motion.button
                      onClick={handleSaveChanges}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FiSave className="mr-2" /> Save Changes
                    </motion.button>
                    <motion.button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>
                  </>
                ) : (
                  <>
                    {appointment.status?.toLowerCase() === 'scheduled' && (
                      <>
                        <motion.button
                          onClick={handleConfirm}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FiCheckCircle className="mr-2" /> Confirm
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          disabled={loading}
                          className={`px-4 py-2 ${confirmingCancel ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg hover:bg-red-700 hover:text-white transition-colors flex items-center`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FiXCircle className="mr-2" /> {confirmingCancel ? 'Confirm Cancel' : 'Cancel'}
                        </motion.button>
                      </>
                    )}
                    
                    {appointment.status?.toLowerCase() === 'confirmed' && (
                      <motion.button
                        onClick={handleCancel}
                        disabled={loading}
                        className={`px-4 py-2 ${confirmingCancel ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg hover:bg-red-700 hover:text-white transition-colors flex items-center`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FiXCircle className="mr-2" /> {confirmingCancel ? 'Confirm Cancel' : 'Cancel'}
                      </motion.button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AppointmentDetails; 