import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { PatientContext } from '../context/PatientContext';
import { ratingService, appointmentService, doctorService } from '../services/api';
import { toast } from 'react-toastify';
import { FaStar, FaRegStar, FaUserMd, FaCalendarCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import ProfilePicture from '../components/ProfilePicture';

const PatientDoctorRatings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, userData, backendUrl } = useContext(AppContext);
  const { patientProfile } = useContext(PatientContext);
  
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [existingRatings, setExistingRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [error, setError] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    if (!token) {
      toast.error('Please log in to access this page');
      navigate('/login');
      return;
    }
    
    // Reset error state
    setError(null);
    fetchDoctorsWithAppointments();
  }, [token]);

  // Check for doctorId URL parameter and auto-select that doctor
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const doctorIdParam = params.get('doctorId');
    
    if (doctorIdParam && doctors.length > 0) {
      const matchingDoctor = doctors.find(d => d.id === parseInt(doctorIdParam));
      if (matchingDoctor) {
        handleSelectDoctor(matchingDoctor);
      } else {
        console.log(`Doctor with ID ${doctorIdParam} not found in the list`);
      }
    }
  }, [doctors, location.search]);

  const fetchDoctorsWithAppointments = async () => {
    setLoading(true);
    setLoadingDoctors(true);
    try {
      // Get patient ID - either from context or localStorage
      const patientId = patientProfile?.id || localStorage.getItem('patientId');
      
      if (!patientId) {
        toast.error('Patient profile not found');
        setError('Patient profile not found. Please complete your profile first.');
        navigate('/my-profile');
        return;
      }
      
      console.log("Fetching doctors with appointments for patient ID:", patientId);
      
      // Use the new endpoint to get doctors with appointments
      const response = await doctorService.getDoctorsWithPatientAppointments(patientId);
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const doctorsData = response.data.data;
        console.log(`Fetched ${doctorsData.length} doctors with appointments`);
        
        if (doctorsData.length === 0) {
          // Show a message that you can only rate doctors you've had appointments with
          console.log("No doctors with appointments found, showing empty list with message");
          setError("You haven't had any appointments with doctors yet. You can only rate doctors you've had appointments with.");
          setDoctors([]);
        } else {
          // Format doctors data with appointments
          const formattedDoctors = doctorsData.map(doctor => ({
            ...doctor,
            appointments: [{
              appointmentDate: doctor.lastAppointment,
              doctorId: doctor.id,
              doctorName: `${doctor.firstName} ${doctor.lastName}`
            }]
          }));
          
          setDoctors(formattedDoctors);
        }
      } else {
        console.warn("Invalid or empty response format from getDoctorsWithPatientAppointments:", response);
        setError("Could not retrieve your doctors. Please try again later.");
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch your appointments and doctors. Please try again later.');
      toast.error('Failed to fetch your appointments and doctors');
    } finally {
      setLoading(false);
      setLoadingDoctors(false);
    }
  };

  const fetchDoctorRatings = async (doctorId) => {
    setLoadingRatings(true);
    let apiNotAvailable = false; // Renamed for clarity, will also track if API call was skipped due to bad ID
    let customMessage = null;

    try {
      const userRole = userData?.role || localStorage.getItem('userRole');
      console.log(`[PatientDoctorRatings.fetchDoctorRatings] Fetching for doctorId: "${doctorId}", userRole: "${userRole}"`);

      // Ensure selectedDoctor.id is used if doctorId is an object
      const idToFetch = (typeof doctorId === 'object' && doctorId !== null) ? doctorId.id : doctorId;

      const response = await ratingService.getDoctorRatingsWithFallback(idToFetch, userRole);
      console.log("[PatientDoctorRatings.fetchDoctorRatings] Response from service:", response);

      if (response && response.data) {
        if (response.error) { // Check for custom error from service (e.g., invalid ID)
          console.warn(`[PatientDoctorRatings.fetchDoctorRatings] Service returned custom error: ${response.error}`);
          apiNotAvailable = true;
          customMessage = response.error; // Store the custom message
          setExistingRatings([]);
        } else {
          setExistingRatings(response.data);
          console.log(`[PatientDoctorRatings.fetchDoctorRatings] Fetched ${response.data.length} ratings for doctor ${idToFetch}`);
        }
      } else {
        // This case might occur if response is undefined or response.data is undefined
        console.warn("[PatientDoctorRatings.fetchDoctorRatings] No data in response or response is undefined. Response:", response);
        setExistingRatings([]);
        apiNotAvailable = true; // Treat as API not available if data is missing
        customMessage = "Failed to retrieve ratings. Response was empty or malformed.";
      }
    } catch (error) {
      console.error('[PatientDoctorRatings.fetchDoctorRatings] Error fetching doctor ratings:', error);
      apiNotAvailable = true; // An actual error occurred
      customMessage = "An error occurred while fetching ratings.";

      if (error.response) {
        if (error.response.status === 403) {
          console.log('[PatientDoctorRatings.fetchDoctorRatings] Access denied due to role restrictions (403)');
          customMessage = "Access to ratings is restricted for your role.";
        } else if (error.response.status === 404) {
          console.log('[PatientDoctorRatings.fetchDoctorRatings] Ratings API returned 404 - might not be implemented yet');
          customMessage = "Ratings information not found for this doctor (404).";
        } else {
          toast.error(`Error ${error.response.status}: ${error.response.statusText || 'Failed to fetch ratings'}`);
          customMessage = `API Error ${error.response.status}: Could not fetch ratings.`;
        }
      } else {
        console.log('[PatientDoctorRatings.fetchDoctorRatings] Network or other client-side error when fetching ratings');
        customMessage = "A network or client-side error occurred. Please check your connection.";
      }
      setExistingRatings([]); // Clear existing ratings on error
    } finally {
      setLoadingRatings(false);
      // Return an object indicating if API was unavailable and any custom message
      return { apiNotAvailable, message: customMessage }; 
    }
  };

  const handleSelectDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setRating(0);
    setComment('');

    // doctor.id might be a name if it was a partial doctor from appointments
    const doctorIdToFetch = doctor.id;
    console.log("[PatientDoctorRatings.handleSelectDoctor] Selected doctor, fetching ratings for ID:", doctorIdToFetch);
    
    // Fetch ratings and get status object
    const { apiNotAvailable, message } = await fetchDoctorRatings(doctorIdToFetch);
    
    if (apiNotAvailable) {
      console.warn(`[PatientDoctorRatings.handleSelectDoctor] API was not available or call skipped. Message: "${message}"`);
      // Display the custom message or a default demo rating
      setExistingRatings([{
        id: 'demo1',
        doctorId: doctorIdToFetch, // Use the id we attempted to fetch with
        score: 0, // Show 0 stars for error/unavailable cases
        comment: message || "Ratings are currently unavailable for this doctor.",
        createdDate: new Date().toISOString(),
        isDemo: true // Add a flag to identify demo/error items if needed for UI
      }]);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !selectedDoctor.id) { // Also check selectedDoctor.id existence
      toast.error('Please select a doctor to rate');
      return;
    }
    
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }
    
    const patientId = patientProfile?.id || localStorage.getItem('patientId');
    if (!patientId) {
      toast.error('Patient profile not found. Please ensure your profile is complete.');
      return;
    }
    
    const userRole = userData?.role || localStorage.getItem('userRole');
    if (userRole !== 'Patient') {
      toast.error('Only patients can submit ratings');
      return;
    }

    // Attempt to parse doctorId to ensure it's a number
    const numericDoctorId = parseInt(selectedDoctor.id);

    if (isNaN(numericDoctorId)) {
      toast.error('Cannot submit rating: The selected doctor does not have a valid numeric ID.');
      console.error('[PatientDoctorRatings.handleSubmitRating] Attempted to submit rating with non-numeric doctor ID:', selectedDoctor.id);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const ratingData = {
        doctorId: numericDoctorId, // Use the parsed numeric ID
        score: rating,
        comment: comment
      };
      
      console.log("[PatientDoctorRatings.handleSubmitRating] Submitting rating data:", ratingData);
      await ratingService.submitRating(ratingData);
      toast.success('Rating submitted successfully');
      
      setRating(0);
      setComment('');
      // Refresh ratings for the currently selected doctor
      if (selectedDoctor && selectedDoctor.id) { // Ensure selectedDoctor and its id are valid
        fetchDoctorRatings(selectedDoctor.id);
      }

    } catch (error) {
      console.error('Error submitting rating:', error);
      
      if (error.response) {
        if (error.response.status === 403) {
          toast.error('You do not have permission to submit ratings. Only patients can rate doctors.');
        } else if (error.response.status === 401) {
          toast.error('You must be logged in to submit ratings.');
          navigate('/login');
        } else if (error.response.status === 400) {
          // Log the detailed validation errors if available
          console.error('Validation errors from backend:', error.response.data?.errors);
          let errorMsg = 'Failed to submit rating due to validation errors.';
          if (error.response.data?.errors) {
            // Attempt to format validation errors nicely, e.g., taking the first error message
            const validationErrors = error.response.data.errors;
            const firstErrorField = Object.keys(validationErrors)[0];
            if (firstErrorField && validationErrors[firstErrorField] && validationErrors[firstErrorField][0]) {
              errorMsg = `Validation Error: ${validationErrors[firstErrorField][0]}`;
            }
          }
          toast.error(errorMsg);
        } else {
          toast.error(error.response?.data?.message || `Error ${error.response.status}: Failed to submit rating`);
        }
      } else {
        toast.error('Network error when submitting rating. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return "N/A";
    }
  };

  // Component for rating stars
  const RatingStars = ({ value, onChange, onHover, readOnly = false }) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, index) => {
          const ratingValue = index + 1;
          return (
            <button
              type="button"
              key={ratingValue}
              className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} text-2xl p-1 focus:outline-none transition-colors`}
              onClick={() => !readOnly && onChange(ratingValue)}
              onMouseEnter={() => !readOnly && onHover(ratingValue)}
              onMouseLeave={() => !readOnly && onHover(0)}
              disabled={readOnly}
            >
              {ratingValue <= (hover || value) ? (
                <FaStar className="text-yellow-400" />
              ) : (
                <FaRegStar className="text-yellow-400" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Calculate average rating for a doctor
  const getAverageRating = (doctorId) => {
    const doctorRatings = existingRatings.filter(r => 
      String(r.doctorId) === String(doctorId) || 
      String(r.DoctorId) === String(doctorId)
    );
    
    if (doctorRatings.length === 0) return 0;
    
    const sum = doctorRatings.reduce((total, current) => {
      // Check all possible rating field names
      const ratingValue = current.score || current.Score || 
                          current.rating || current.Rating || 0;
      return total + parseFloat(ratingValue);
    }, 0);
    
    return sum / doctorRatings.length;
  };

  // Get rating value accounting for different possible field names
  const getRatingValue = (review) => {
    return review.score || review.Score || 
           review.rating || review.Rating || 0;
  };

  // Get comment value accounting for different possible field names
  const getCommentValue = (review) => {
    return review.comment || review.Comment || 
           review.content || review.Content || 
           "No comment provided";
  };

  // Get date value accounting for different possible field names
  const getDateValue = (review) => {
    return review.createdDate || review.CreatedDate || 
           review.date || review.Date || 
           review.createdAt || review.CreatedAt || 
           new Date().toISOString();
  };

  if (loading && loadingDoctors) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-700 text-lg text-center">Loading your appointments and doctors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => navigate('/doctors')}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find Doctors
              </button>
              <button 
                onClick={() => {
                  setError(null); 
                  fetchDoctorsWithAppointments();
                }}
                className="px-5 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Ratings</h1>
        <p className="text-gray-600 mb-4">Rate and review doctors you've had appointments with</p>
        
        {/* Information notice about rating policy */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
          <div className="flex">
            <FaInfoCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-1" />
            <span>You can only rate doctors you've had appointments with. This ensures that ratings come from actual patients who have experienced the doctor's care.</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctors List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Your Doctors</h2>
                {loadingDoctors && (
                  <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                )}
              </div>
              
              {doctors.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <FaUserMd className="mx-auto text-gray-300 text-5xl mb-4" />
                  <p className="text-gray-500 mb-1">No doctors found</p>
                  <p className="text-sm text-gray-400 mb-2">You can only rate doctors you've had appointments with</p>
                  <p className="text-sm text-gray-400 mb-4">Book an appointment first to be able to rate a doctor</p>
                  <button 
                    onClick={() => navigate('/doctors')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Find & Book Doctors
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {doctors.map(doctor => (
                    <div 
                      key={doctor.id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedDoctor?.id === doctor.id 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => handleSelectDoctor(doctor)}
                    >
                      <div className="flex items-center">
                        <ProfilePicture
                          imageUrl={doctor.profilePicture}
                          type="doctor"
                          className="w-12 h-12 rounded-full mr-4"
                          alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Dr. {doctor.firstName || ''} {doctor.lastName || ''}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {doctor.specializationName || "Specialist"}
                          </p>
                          <div className="flex items-center mt-1">
                            <RatingStars value={Math.round(getAverageRating(doctor.id))} readOnly={true} />
                            <span className="ml-2 text-sm text-gray-500">
                              ({existingRatings.filter(r => String(r.doctorId) === String(doctor.id)).length})
                            </span>
                          </div>
                        </div>
                      </div>
                      {doctor.appointments && doctor.appointments.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 flex items-center">
                            <FaCalendarCheck className="mr-1" /> 
                            Last visit: {formatDate(doctor.appointments.sort((a, b) => {
                              // Safely parse dates, falling back if invalid
                              const dateA = new Date(a.appointmentDate);
                              const dateB = new Date(b.appointmentDate);
                              
                              if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                                return 0; // Can't compare
                              }
                              
                              return dateB - dateA;
                            })[0]?.appointmentDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Rating Form and Existing Ratings */}
          <div className="lg:col-span-2">
            {selectedDoctor ? (
              <div className="space-y-6">
                {/* Rating Form */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Rate Dr. {selectedDoctor.firstName || ''} {selectedDoctor.lastName || ''}
                  </h2>
                  
                  <form onSubmit={handleSubmitRating}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Rating
                      </label>
                      <RatingStars 
                        value={rating} 
                        onChange={setRating} 
                        onHover={setHover} 
                      />
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Review
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        placeholder="Share your experience with this doctor..."
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={rating === 0 || submitting}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <span className="animate-spin h-5 w-5 mr-3 border-t-2 border-l-2 border-white rounded-full"></span>
                          Submitting...
                        </>
                      ) : (
                        'Submit Rating'
                      )}
                    </button>
                  </form>
                </div>
                
                {/* Existing Ratings */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Patient Reviews</h2>
                  
                  {loadingRatings ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : existingRatings.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <FaInfoCircle className="mx-auto text-gray-300 text-4xl mb-4" />
                      <p className="text-gray-500 mb-2">No reviews yet</p>
                      <p className="text-sm text-gray-400">Be the first to rate this doctor!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {existingRatings.map((review, index) => (
                        <div key={review.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <RatingStars value={getRatingValue(review)} readOnly={true} />
                                <span className="ml-2 text-sm text-gray-500">
                                  {formatDate(getDateValue(review))}
                                </span>
                                {/* Verified visit badge */}
                                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                                  <FaCalendarCheck className="mr-1" />
                                  Verified Visit
                                </span>
                              </div>
                              <p className="mt-2 text-gray-700">{getCommentValue(review)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-8 text-center h-64 flex flex-col items-center justify-center">
                <FaUserMd className="text-gray-300 text-5xl mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a Doctor</h2>
                <p className="text-gray-500 max-w-md">
                  Please select a doctor from the list to rate or view reviews
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDoctorRatings; 