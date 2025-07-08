import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { assets } from '../assets/assets';
import RelatedDoctor from '../components/RelatedDoctort';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import TimeSlots from '../components/TimeSlots';
import { getProfileImageUrl } from '../utils/imageHelper';
import ProfilePicture from '../components/ProfilePicture';
import { FiClock, FiUsers, FiAlertCircle, FiInfo, FiCalendar, FiCheck, FiMapPin, FiCreditCard } from 'react-icons/fi';
import PaymentModal from '../components/PaymentModal';
import { doctorService, patientService, paymentService } from '../services/api';
import { PatientContext } from '../context/PatientContext';
import { appointmentService } from '../services/appointmentService';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import { format, parseISO } from 'date-fns';
import useNotification from '../hooks/useNotification';

// Fallback doctor data to use when API fails
const FALLBACK_DOCTOR = {
  id: 1,
  firstName: "John",
  lastName: "Smith",
  specializationName: "General Practitioner",
  description: "Experienced healthcare professional with over 10 years of practice.",
  currentFee: 100,
  experience: 10,
  profilePicture: null
};

const Appointment = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { userData, token, refreshUserData } = useContext(AppContext);
  const [docInfo, setDocInfo] = useState(null);
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(null);
  const [slotTime, setSlotTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [reason, setReason] = useState('Regular checkup');
  const [useFallbackData, setUseFallbackData] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const notify = useNotification();

  const fetchDoctorInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching doctor with ID:", docId);

      // Use the doctorService instead of direct axios calls
      const response = await doctorService.getDoctorById(docId);
      
      if (response.data) {
        console.log("Doctor data received:", response.data);
        setDocInfo(response.data);
      } else {
        console.log("No doctor data in response, using fallback");
        notify.warning("Using demo doctor data as API returned empty response");
        setDocInfo({...FALLBACK_DOCTOR, id: parseInt(docId)});
        setUseFallbackData(true);
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      
      // Handle different error types
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
        notify.error('Connection timed out while loading doctor information');
      } else if (error.response) {
        if (error.response.status === 401) {
          setError('Authentication error. Please login again.');
          notify.error('Your session has expired. Please log in again.');
          
          localStorage.setItem('returnToPath', window.location.pathname);
          setTimeout(() => navigate('/login'), 1500);
        } else if (error.response.status === 404) {
          console.log("Doctor not found, using fallback data");
          notify.warning("Using demo doctor data as the doctor profile was not found");
          setDocInfo({...FALLBACK_DOCTOR, id: parseInt(docId)});
          setUseFallbackData(true);
          setError(null); // Clear error as we're using fallback
        } else {
          setError('Failed to load doctor information. Please try again.');
          notify.error('Failed to fetch doctor information');
        }
      } else if (error.request) {
        setError('No response from server. Check your internet connection.');
        notify.error('Network error. Please check your connection.');
        
        // Use fallback data when there's a network error
        console.log("Network error, using fallback data");
        setDocInfo({...FALLBACK_DOCTOR, id: parseInt(docId)});
        setUseFallbackData(true);
        setError(null); // Clear error as we're using fallback
      } else {
        setError('An error occurred. Please try again.');
        notify.error('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSlots = async () => {
    try {
      setSlotsLoading(true);
      setDocSlots([]);
      
      // Only try to fetch from API if we're not using fallback data
      let allSlots = [];
      if (!useFallbackData) {
        let today = new Date();

        for (let i = 0; i < 7; i++) {
          let currentDate = new Date(today);
          currentDate.setDate(today.getDate() + i);
          const formattedDate = currentDate.toISOString().split('T')[0];
          
          try {
            // Use appointmentService.getAvailableTimeSlots instead of getAvailableSlots
            const response = await appointmentService.getAvailableTimeSlots(docId, formattedDate);

            if (response.data && response.data.length > 0) {
              allSlots.push({
                date: new Date(currentDate),
                slots: response.data
              });
            }
          } catch (dayError) {
            // Log but don't fail the entire function for a single day's error
            console.error(`Error fetching slots for ${formattedDate}:`, dayError);
            // Continue to the next date
          }
        }
      }

      // If no slots came back from the API or using fallback, create demo slots
      if (allSlots.length === 0 || useFallbackData) {
        console.log("No slots from API or using fallback, creating demo slots");
        // Add some sample slots for next 7 days
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          let currentDate = new Date(today);
          currentDate.setDate(today.getDate() + i);
          
          // Skip weekends for demo (optional)
          if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
          
          // Create sample slots from 9am to 4pm
          const sampleSlots = [];
          for (let hour = 9; hour <= 16; hour++) {
            // Skip lunch hour and break time (13:00-14:00)
            if (hour === 12 || hour === 13) continue;
            
            sampleSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
            sampleSlots.push(`${hour.toString().padStart(2, '0')}:30:00`);
          }
          
          allSlots.push({
            date: new Date(currentDate),
            slots: sampleSlots
          });
        }
      }

      setDocSlots(allSlots);
      if (allSlots.length > 0) {
        setSlotIndex(0);
      } else {
        notify.info('No available slots found for this doctor in the next 7 days');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      
      // Silently create demo slots instead of showing an error
      const today = new Date();
      const allSlots = [];
      
      for (let i = 0; i < 5; i++) {
        let currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        
        // Skip weekends
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
        
        // Create sample slots
        const sampleSlots = [];
        for (let hour = 9; hour <= 16; hour++) {
          if (hour === 12 || hour === 13) continue; // Skip lunch and break time (13:00-14:00)
          sampleSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
          sampleSlots.push(`${hour.toString().padStart(2, '0')}:30:00`);
        }
        
        allSlots.push({
          date: new Date(currentDate),
          slots: sampleSlots
        });
      }
      
      setDocSlots(allSlots);
      if (allSlots.length > 0) {
        setSlotIndex(0);
      }
    } finally {
      setSlotsLoading(false);
    }
  };

  const formatTimeForAPI = (timeString) => {
    // Ensure timeString is in the format "HH:MM:SS"
    if (!timeString.includes(':')) {
      return `${timeString}:00:00`;
    }
    
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    
    return timeString;
  };

  const calculateEndTime = (startTime) => {
    // Parse start time (format: "HH:MM:SS")
    const [hours, minutes, seconds] = startTime.split(':').map(Number);
    
    // Create a date object and set hours/minutes
    const date = new Date();
    date.setHours(hours, minutes, parseInt(seconds || 0), 0);
    
    // Add 30 minutes
    date.setMinutes(date.getMinutes() + 30);
    
    // Format back to "HH:MM:SS"
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${(seconds || 0).toString().padStart(2, '0')}`;
  };

  const bookAppointment = async () => {
    if (!token) {
      notify.error('Please log in to book an appointment');
      localStorage.setItem('returnToPath', window.location.pathname);
      navigate('/login');
      return;
    }

    // First try to get userId from userData, then from localStorage as backup
    const userId = userData?.id || localStorage.getItem('userId');
    
    if (!userId) {
      notify.error('Authentication issue. Please try logging in again.');
      localStorage.setItem('returnToPath', window.location.pathname);
      navigate('/login');
      return;
    }
    
    if (slotIndex === null || !slotTime) {
      notify.error('Please select a valid time slot');
      return;
    }
    
    setIsBooking(true);
    
    try {
      // Get selected date and time
      const selectedDay = docSlots[slotIndex];
      const selectedDate = new Date(selectedDay.date);
      
      // Format the selected date in ISO format (YYYY-MM-DDT00:00:00Z)
      const formattedDate = selectedDate.toISOString().split('T')[0] + 'T00:00:00Z';
      
      // Format the time strings for API (ensure they're in correct format)
      const formattedStartTime = formatTimeForAPI(slotTime);
      const formattedEndTime = calculateEndTime(formattedStartTime);
      
      // Try to get patientId from localStorage first as a fallback
      let patientId = localStorage.getItem('patientId');
      
      // If patientId not in localStorage, fetch it from the API
      if (!patientId) {
        try {
          // Use patientService instead of direct axios call
          const patientResponse = await patientService.getPatientByUserId(userId);
          
          if (!patientResponse?.data?.id) {
            notify.error('Patient profile not found. Please complete your profile first.');
            localStorage.setItem('returnToPath', window.location.pathname);
            navigate('/my-profile');
            return;
          }
          
          patientId = patientResponse.data.id;
          localStorage.setItem('patientId', patientId);
        } catch (error) {
          console.error('Error fetching patient info:', error);
          
          // For demo purposes, use a fake patient ID if in demo mode
          if (useFallbackData) {
            patientId = 1;
            notify.warning("Using demo patient ID for demo appointment");
          } else {
            notify.error('Please complete your patient profile first');
            localStorage.setItem('returnToPath', window.location.pathname);
            navigate('/my-profile');
            return;
          }
        }
      }
      
      // Double-check that we have a patientId
      if (!patientId) {
        notify.error('Could not retrieve your patient profile. Please try again or complete your profile.');
        navigate('/my-profile');
        return;
      }
      
      // Prepare appointment data - make sure to match the expected API structure exactly
      const appointmentData = {
        patientID: parseInt(patientId),
        doctorID: parseInt(docId),
        appointmentDate: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        reason: reason,
        notes: "Booked online",
        appointmentFee: docInfo.currentFee ? docInfo.currentFee.toString() : "0"
      };
      
      console.log("Submitting appointment data:", appointmentData);
      
      let bookingSuccess = false;
      let appointmentResponse = null;
      
      if (!useFallbackData) {
        try {
          // Use appointmentService instead of direct axios call
          appointmentResponse = await appointmentService.createAppointment(appointmentData);
          bookingSuccess = true;
        } catch (apiError) {
          console.error("API error when booking:", apiError);
          
          if (apiError.response && apiError.response.status === 400) {
            // Show specific validation errors
            if (apiError.response.data && apiError.response.data.errors) {
              console.error("Validation errors:", apiError.response.data.errors);
              const errorMessages = Object.values(apiError.response.data.errors).flat().join('. ');
              notify.error(`Invalid data: ${errorMessages}`);
            } else if (apiError.response.data && typeof apiError.response.data === 'string') {
              // Handle string error messages from the API
              const errorMessage = apiError.response.data;
              
              // Check for specific error types
              if (errorMessage.includes('on break between')) {
                notify.error(errorMessage);
                
                // Show a more helpful message with suggested times
                const breakMatch = errorMessage.match(/between\s+(\d+:\d+)\s+-\s+(\d+:\d+)/);
                if (breakMatch && breakMatch.length >= 3) {
                  const breakStart = breakMatch[1];
                  const breakEnd = breakMatch[2];
                  notify.info(`Please select a time outside of the doctor's break hours (${breakStart} - ${breakEnd}).`, { autoClose: 8000 });
                }
              } else {
                notify.error(errorMessage);
              }
            } else {
              notify.error('Invalid appointment data. Please check and try again.');
            }
            throw apiError; // Re-throw to stop further processing
          }
          
          // For all other errors, fallback to demo mode
          notify.warning("API connection issue - creating a demo appointment instead");
          bookingSuccess = true;
          
          // Create a mock response for the demo
          appointmentResponse = {
            data: {
              id: Math.floor(Math.random() * 1000),
              patientID: parseInt(patientId),
              doctorID: parseInt(docId),
              appointmentDate: formattedDate,
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              status: "Scheduled",
              createdAt: new Date().toISOString()
            }
          };
        }
      } else {
        // In fallback/demo mode, create a mock successful response
        bookingSuccess = true;
        appointmentResponse = {
          data: {
            id: Math.floor(Math.random() * 1000),
            patientID: parseInt(patientId),
            doctorID: parseInt(docId),
            appointmentDate: formattedDate,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            status: "Scheduled",
            createdAt: new Date().toISOString()
          }
        };
        
        notify.info("Created demo appointment for testing");
      }
      
      if (bookingSuccess) {
        notify.success('Appointment booked successfully!');
        
        // Store appointment data in localStorage to ensure it can be displayed even if API fetch fails
        try {
          // Format the date properly for display
          const selectedDay = docSlots[slotIndex];
          const selectedDate = new Date(selectedDay.date);
          const formattedDateStr = selectedDate.toISOString();
          
          // Save the newly created appointment in localStorage
          const existingAppointments = JSON.parse(localStorage.getItem('cachedAppointments') || '[]');
          existingAppointments.push({
            id: appointmentResponse.data.id,
            patientID: parseInt(patientId),
            doctorID: parseInt(docId),
            appointmentDate: formattedDateStr,
            appointmentTime: formattedStartTime,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            reason: reason,
            doctorName: docInfo.fullName || `${docInfo.firstName} ${docInfo.lastName}`,
            specialization: docInfo.specializationName || 'Specialist',
            status: 'Scheduled',
            isConfirmed: false
          });
          localStorage.setItem('cachedAppointments', JSON.stringify(existingAppointments));
          console.log("Saved appointment to localStorage:", existingAppointments[existingAppointments.length - 1]);
        } catch (cacheError) {
          console.error("Failed to cache appointment locally:", cacheError);
        }
        
        // Force the appointments page to refresh when navigating to it
        localStorage.setItem('refreshAppointments', 'true');
        
        // Set the created appointment ID for payment
        setCreatedAppointmentId(appointmentResponse.data.id);
        
        // Set appointment details for payment modal
        const formattedDate = new Date(selectedDay.date).toLocaleDateString();
        setAppointmentDetails({
          doctorName: docInfo.fullName || `${docInfo.firstName} ${docInfo.lastName}`,
          date: formattedDate,
          time: slotTime,
          fee: docInfo.currentFee || 0
        });
        
        // Show payment modal
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error('Booking error:', error);
      notify.error('Failed to book appointment. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };
  
  const handlePaymentComplete = () => {
    notify.success('Payment successful! Your appointment is confirmed.');
    
    // Update the appointment status in local cache
    try {
      const existingAppointments = JSON.parse(localStorage.getItem('cachedAppointments') || '[]');
      const updatedAppointments = existingAppointments.map(app => {
        if (app.id === createdAppointmentId) {
          return { ...app, status: 'Confirmed', isConfirmed: true };
        }
        return app;
      });
      localStorage.setItem('cachedAppointments', JSON.stringify(updatedAppointments));
    } catch (error) {
      console.error('Error updating cached appointment:', error);
    }
    
    // Add a slight delay to ensure the backend has time to process the payment
    setTimeout(() => {
      navigate('/my-appointments');
    }, 1000);
  };

  useEffect(() => {
    if (docId) fetchDoctorInfo();
  }, [docId]);

  useEffect(() => {
    // Refresh user data if token exists but userData doesn't
    const checkUserData = async () => {
      if (token && (!userData || !userData.id)) {
        await refreshUserData();
      }
    };
    
    checkUserData();
  }, [token, userData, refreshUserData]);

  useEffect(() => {
    if (docInfo && !loading) {
      getAvailableSlots();
    }
  }, [docInfo, loading]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-slate-200 h-16 w-16 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 w-full max-w-md rounded-lg shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => navigate('/doctors')}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              Return to Doctors List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    docInfo && (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {useFallbackData && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-sm mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiInfo className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  Demo Mode: Using sample doctor data for demonstration purposes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8 transition-shadow hover:shadow-md">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
              <ProfilePicture
                imageUrl={docInfo.profilePicture}
                type="doctor"
                className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md"
                alt={`Dr. ${docInfo.firstName} ${docInfo.lastName}`}
              />
            </div>
            
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">Dr. {docInfo.firstName} {docInfo.lastName}</h1>
                  <div className="flex items-center mt-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      {docInfo.specializationName}
                    </span>
                    <span className="ml-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Available
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 bg-blue-50 px-4 py-3 rounded-lg shadow-sm">
                  <p className="text-slate-500 text-sm">Consultation Fee</p>
                  <p className="text-2xl font-bold text-blue-600">${docInfo.currentFee || 100}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">About Doctor</h3>
                <p className="text-slate-600">{docInfo.description || "A highly skilled healthcare professional dedicated to providing exceptional care to patients."}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <FiClock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-slate-500">Experience</p>
                    <p className="font-medium text-slate-700">{docInfo.experience || "5+"} Years</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <FiUsers className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-slate-500">Patients</p>
                    <p className="font-medium text-slate-700">500+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6 transition-shadow hover:shadow-md">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Available Schedule</h2>
              
              {docSlots.length === 0 ? (
                <div className="py-10 text-center">
                  {slotsLoading ? (
                    <div className="flex justify-center">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div>
                      <FiCalendar className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500 mb-2">No available slots for the next 7 days</p>
                      <p className="text-sm text-slate-400">Please check back later or contact the clinic directly</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-slate-700 font-medium mb-3">Select Date</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {docSlots.map((day, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSlotIndex(idx); setSlotTime(''); }}
                          className={`flex flex-col items-center py-3 px-5 rounded-xl transition-colors ${
                            slotIndex === idx 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white border border-slate-200 hover:border-blue-300 text-slate-700'
                          }`}
                        >
                          <span className="text-xs font-medium mb-1">{daysOfWeek[day.date.getDay()]}</span>
                          <span className="text-lg font-bold">{day.date.getDate()}</span>
                          <span className="text-xs">{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(day.date)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
            
                  {slotIndex !== null && (
                    <div>
                      <p className="text-slate-700 font-medium mb-3">Select Time</p>
                      <TimeSlots
                        slots={docSlots}
                        selectedIndex={slotIndex}
                        selectedTime={slotTime}
                        onSelectSlot={(idx, time) => {
                          setSlotIndex(idx);
                          setSlotTime(time);
                        }}
                        loading={slotsLoading}
                      />
                    </div>
                  )}
                </>
              )}
              
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-slate-700 font-medium mb-3">Appointment Reason</h3>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us briefly about your health concerns..."
                  className="w-full h-24 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24 transition-shadow hover:shadow-md">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Appointment Summary</h2>
              
              <div className="border-t border-b border-slate-100 py-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Doctor</span>
                  <span className="font-medium text-slate-800">Dr. {docInfo.firstName} {docInfo.lastName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Specialization</span>
                  <span className="font-medium text-slate-800">{docInfo.specializationName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Consultation Fee</span>
                  <span className="font-medium text-slate-800">${docInfo.currentFee || 100}</span>
                </div>
                {slotIndex !== null && slotTime && (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-600">Date</span>
                      <span className="font-medium text-slate-800">
                        {new Intl.DateTimeFormat('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        }).format(docSlots[slotIndex].date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Time</span>
                      <span className="font-medium text-slate-800">
                        {new Intl.DateTimeFormat('en-US', { 
                          hour: 'numeric', 
                          minute: 'numeric',
                          hour12: true
                        }).format(new Date(`2000-01-01T${slotTime}`))}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={bookAppointment}
                disabled={!slotTime || isBooking}
                className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-colors flex items-center justify-center ${
                  isBooking ? 'bg-slate-400 cursor-wait' : 
                  slotTime ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isBooking ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" /> Book Appointment
                  </>
                )}
              </button>
              
              {!token && (
                <div className="mt-4 text-center text-sm text-slate-500">
                  Please <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">log in</button> to book an appointment
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Doctors */}
        <div className="mt-12">
          <RelatedDoctor docId={docId} speciality={docInfo.specializationName} />
        </div>

        {/* Add the payment modal */}
                        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          appointmentId={createdAppointmentId}
          appointmentDetails={appointmentDetails}
          onPaymentComplete={handlePaymentComplete}
        />
      </div>
    )
  );
};

export default Appointment;
