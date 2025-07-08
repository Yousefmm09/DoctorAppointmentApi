import React, { useState, useEffect, useContext } from 'react';
import { FaStar, FaRegStar, FaUserMd, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { ratingService } from '../../services/api';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

const RatingComponent = ({ 
  doctorId, 
  patientId, 
  onRatingSubmit,
  appointmentId = null,
  readOnly = false,
  showRatings = false,
  className = ''
}) => {
  const { token, userData } = useContext(AppContext);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [doctorRatings, setDoctorRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch existing ratings if showRatings is true
  useEffect(() => {
    if (showRatings && doctorId) {
      fetchDoctorRatings();
    }
  }, [doctorId, showRatings]);

  const fetchDoctorRatings = async () => {
    setLoading(true);
    try {
      // Use the new helper function that handles role-based fallbacks
      let ratingsData = [];
      try {
        // Get user role from context
        const userRole = userData?.role || localStorage.getItem('userRole');
        const response = await ratingService.getDoctorRatingsWithFallback(doctorId, userRole);
        
        if (response && response.data) {
          ratingsData = response.data;
          console.log(`Fetched ${ratingsData.length} ratings for doctor ${doctorId} using role-based access`);
        }
      } catch (error) {
        console.error('Error using role-based ratings access:', error);
        
        // If the helper function fails, try the anonymous average rating endpoint
        try {
          const avgResponse = await ratingService.getAverageRating(doctorId);
          if (avgResponse && avgResponse.data) {
            setAverageRating(avgResponse.data);
            
            // Create a mock rating entry from the average
            ratingsData = [{
              id: 'avg-only',
              doctorId: doctorId,
              score: avgResponse.data,
              comment: "Average rating displayed - individual ratings not available due to access restrictions.",
              createdDate: new Date().toISOString()
            }];
          }
        } catch (avgError) {
          console.error('Error fetching average rating as fallback:', avgError);
        }
      }
      
      setDoctorRatings(ratingsData);

      // If we have ratings data but no average yet, calculate it
      if (ratingsData.length > 0 && averageRating === 0) {
        const sum = ratingsData.reduce((total, current) => 
          total + parseFloat(current.score || current.Score || current.rating || 0), 0);
        setAverageRating(sum / ratingsData.length);
      }
    } catch (error) {
      console.error('Error in ratings workflow:', error);
      setDoctorRatings([]);
      setAverageRating(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Please login to submit a rating');
      return;
    }
    
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const ratingData = {
        doctorId: parseInt(doctorId) || doctorId, // Ensure doctorId is a number if possible
        score: rating,
        comment: comment
      };
      
      if (patientId) {
        ratingData.patientId = patientId;
      }
      
      if (appointmentId) {
        ratingData.appointmentId = appointmentId;
      }
      
      await ratingService.submitRating(ratingData);
      toast.success('Rating submitted successfully');
      
      // Reset form
      setRating(0);
      setComment('');
      
      // Refetch ratings if showing them
      if (showRatings) {
        fetchDoctorRatings();
      }
      
      // Callback if provided
      if (onRatingSubmit) {
        onRatingSubmit(ratingData);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      
      // Check for specific error about not having appointments with this doctor
      if (error.response?.data && typeof error.response.data === 'string' && 
          error.response.data.includes('only rate doctors you')) {
        toast.error('You can only rate doctors you\'ve had appointments with');
      } else {
        toast.error(error.response?.data?.message || error.response?.data || 'Failed to submit rating');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Display a row of stars for rating input
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

  // Helper functions to extract data from ratings with different formats
  const getRatingScore = (item) => {
    return item.score || item.Score || item.rating || item.Rating || 0;
  };

  const getRatingDate = (item) => {
    // Try to parse date from various possible fields
    const dateValue = item.createdAt || item.CreatedAt || 
                     item.createdDate || item.CreatedDate || 
                     item.date || item.Date || 
                     new Date().toISOString();
    
    try {
      return new Date(dateValue);
    } catch (err) {
      return new Date();
    }
  };

  const getRatingComment = (item) => {
    return item.comment || item.Comment || item.content || item.Content || '';
  };

  // Component to show existing ratings
  const RatingsList = ({ ratings }) => {
    if (ratings.length === 0) {
      return <p className="text-gray-500 italic mt-4">No ratings yet</p>;
    }

    return (
      <div className="mt-4 space-y-4">
        <h3 className="font-bold text-lg">Patient Reviews</h3>
        {ratings.map((item, index) => (
          <div key={item.id || `rating-${index}`} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-2 mr-3">
                  <FaUser className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{item.patientName || 'Anonymous'}</p>
                  <div className="flex items-center mt-1">
                    <RatingStars value={getRatingScore(item)} readOnly={true} />
                    <span className="ml-2 text-sm text-gray-500">
                      {formatDistanceToNow(getRatingDate(item), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              {item.appointmentId && (
                <div className="flex items-center text-sm text-gray-500">
                  <FaCalendarAlt className="mr-1" />
                  <span>Verified Visit</span>
                </div>
              )}
            </div>
            {getRatingComment(item) && (
              <p className="mt-2 text-gray-700">{getRatingComment(item)}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`rating-component ${className}`}>
      {showRatings && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <div className="mr-2 text-2xl font-bold text-gray-800">{averageRating.toFixed(1)}</div>
            <RatingStars value={Math.round(averageRating)} readOnly={true} />
            <div className="ml-2 text-sm text-gray-500">({doctorRatings.length} reviews)</div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <RatingsList ratings={doctorRatings} />
          )}
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleRatingSubmit} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 flex items-center">
            <FaUserMd className="mr-2 text-blue-600" />
            Rate Your Experience
          </h3>
          
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
          
          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Your Review (Optional)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Share your experience with this doctor..."
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default RatingComponent; 