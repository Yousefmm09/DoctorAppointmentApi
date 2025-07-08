import React, { useContext, useEffect, useState } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { 
  FaStar, 
  FaStarHalfAlt, 
  FaRegStar, 
  FaSearch, 
  FaFilter, 
  FaUserCircle, 
  FaCalendarAlt, 
  FaChartBar,
  FaComment,
  FaTimes,
  FaSortAmountDown,
  FaSortAmountUp,
  FaThumbsUp,
  FaThumbsDown,
  FaFlag,
  FaSpinner,
  FaRegSmile,
  FaRegMeh,
  FaRegFrown,
  FaSlidersH,
  FaSort
} from 'react-icons/fa';
import ProfilePicture from '../../components/ProfilePicture';
import axios from 'axios';

const DoctorRatings = () => {
  const { doctorProfile } = useContext(DoctorContext);
  const { backendUrl, token } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState(null);
  const [filteredRatings, setFilteredRatings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState(0); // 0 means all ratings
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [stats, setStats] = useState({
    averageRating: 0,
    totalRatings: 0,
    distribution: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    }
  });

  // Helper function to check if a string is in UUID format
  const isUuidFormat = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Fetch ratings data
  useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get doctorId from context first
        let doctorId = doctorProfile?.id;
        console.log('[DoctorRatings] Initial doctorId from context:', doctorId);
        
        // If not in context, try localStorage
        if (!doctorId) {
          const storedId = localStorage.getItem('doctorId');
          console.log('[DoctorRatings] Stored doctorId from localStorage:', storedId);
          if (storedId) {
            try {
              // If it's a number string, parse it
              doctorId = /^\d+$/.test(storedId) ? parseInt(storedId) : storedId;
            } catch (e) {
              doctorId = storedId;
            }
          }
        }
        
        // If still no doctorId, try URL params
        if (!doctorId) {
          const urlParams = new URLSearchParams(window.location.search);
          const paramId = urlParams.get('doctorId');
          console.log('[DoctorRatings] doctorId from URL params:', paramId);
          if (paramId) {
            try {
              doctorId = /^\d+$/.test(paramId) ? parseInt(paramId) : paramId;
            } catch (e) {
              doctorId = paramId;
            }
          }
        }
        
        // Last resort: try user ID
        if (!doctorId) {
          const userId = localStorage.getItem('userId');
          console.log('[DoctorRatings] userId from localStorage:', userId);
          if (userId) {
            doctorId = userId;
          }
        }
        
        if (!doctorId) {
          throw new Error('Doctor ID not found. Please complete your profile setup.');
        }
        
        console.log(`[DoctorRatings] Final doctorId to use:`, doctorId);
        
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // First try to get ratings using the doctor endpoint
        try {
          console.log('[DoctorRatings] Attempting to fetch ratings from /api/Ratings/doctor');
          const ratingsResponse = await axios.get(`${backendUrl}/api/Ratings/doctor?doctorId=${doctorId}`, { headers });
          console.log('[DoctorRatings] Received response:', ratingsResponse.data);
          
          if (ratingsResponse.data) {
            const processedData = ratingsResponse.data.map(item => ({
              ...item,
              rating: item.score !== undefined && item.score !== null ? parseFloat(item.score) : 0,
            }));
            
            console.log('[DoctorRatings] Processed ratings data:', processedData);
            setRatings(processedData);
            
            // Calculate distribution
            const distribution = {
              5: 0, 4: 0, 3: 0, 2: 0, 1: 0
            };
            
            processedData.forEach(rating => {
              const score = Math.round(parseFloat(rating.score || 0));
              if (score >= 1 && score <= 5) {
                distribution[score]++;
              }
            });
            
            // Calculate average
            const sum = processedData.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const average = processedData.length > 0 ? sum / processedData.length : 0;
            
            console.log('[DoctorRatings] Calculated stats:', {
              average,
              total: processedData.length,
              distribution
            });
            
            setStats({
              averageRating: average,
              totalRatings: processedData.length,
              distribution
            });
          }
        } catch (error) {
          console.error('[DoctorRatings] Error fetching ratings:', error);
          
          // If unauthorized or forbidden, try the public endpoint
          if (error.response?.status === 401 || error.response?.status === 403) {
            try {
              console.log('[DoctorRatings] Attempting to fetch public ratings');
              const publicResponse = await axios.get(
                `${backendUrl}/api/Ratings/doctor-public?doctorId=${doctorId}`,
                { headers }
              );
              
              if (publicResponse.data) {
                const processedData = publicResponse.data.map(item => ({
                  ...item,
                  rating: item.score !== undefined && item.score !== null ? parseFloat(item.score) : 0,
                }));
                
                console.log('[DoctorRatings] Received public ratings:', processedData);
                setRatings(processedData);
                processRatingsData(processedData);
              }
            } catch (publicError) {
              console.error('[DoctorRatings] Error fetching public ratings:', publicError);
              
              // If all else fails, try to get just the average rating
              try {
                console.log('[DoctorRatings] Attempting to fetch average rating');
                const averageResponse = await axios.get(
                  `${backendUrl}/api/Ratings/doctor/average?doctorId=${doctorId}`
                );
                
                if (averageResponse.data) {
                  console.log('[DoctorRatings] Received average rating:', averageResponse.data);
                  setStats({
                    averageRating: averageResponse.data.averageRating || 0,
                    totalRatings: 0,
                    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                  });
                }
              } catch (avgError) {
                console.error('[DoctorRatings] Error fetching average rating:', avgError);
                throw new Error('Could not fetch any rating information');
              }
            }
          } else {
            throw error;
          }
        }
      } catch (err) {
        console.error('[DoctorRatings] Error in ratings workflow:', err);
        setError(err.message || 'Failed to fetch ratings. Please try again later.');
        
        if (err.response?.status === 401) {
          toast.error('Your session has expired. Please log in again.');
        } else if (err.response?.status === 403) {
          toast.error('You do not have permission to view these ratings.');
        } else {
          toast.error(err.message || 'Failed to fetch ratings. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchRatings();
    } else {
      setError('Please log in to view ratings.');
      setLoading(false);
    }
  }, [backendUrl, token, doctorProfile]);

  // Process ratings data to calculate stats
  const processRatingsData = (data) => {
    if (!data || data.length === 0) {
      setStats({
        averageRating: 0,
        totalRatings: 0,
        distribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      });
      return;
    }
    
    console.log('[DoctorRatings] Processing ratings data:', data);
    
    // Set total ratings to the actual number of reviews
    const total = data.length;
    
    // Calculate average - default to 0 for invalid ratings
    let sum = 0;
    let validRatingCount = 0;
    
    // Initialize distribution to zero for all ratings
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };
    
    // Process each rating to update sum and distribution
    data.forEach(item => {
      // For each item, check for score first, then rating, defaulting to 0
      const ratingValue = parseFloat(item.score || item.rating || 0);
      
      if (!isNaN(ratingValue) && ratingValue > 0) {
        sum += ratingValue;
        validRatingCount++;
        
        // Round to nearest integer for distribution counting
        const roundedRating = Math.round(ratingValue);
        if (roundedRating >= 1 && roundedRating <= 5) {
          distribution[roundedRating]++;
        }
      }
    });
    
    // Calculate the average rating
    const average = validRatingCount > 0 ? sum / validRatingCount : 0;
    
    console.log('[DoctorRatings] Calculated distribution:', distribution);
    console.log('[DoctorRatings] Rating count:', validRatingCount, 'Average:', average);
    
    setStats({
      averageRating: average,
      totalRatings: total, // Always use the actual count of reviews
      distribution
    });
  };

  // Apply filters and sorting
  useEffect(() => {
    // Ensure we have ratings to filter
    if (ratings && ratings.length > 0) {
      let result = [...ratings];
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter(rating => 
          (rating.patientName && rating.patientName.toLowerCase().includes(query)) ||
          (rating.comment && rating.comment.toLowerCase().includes(query))
        );
      }
      
      // Filter by rating
      if (filterRating > 0) {
        result = result.filter(rating => {
          const roundedRating = Math.round(parseFloat(rating.score || rating.rating || 0));
          return roundedRating === filterRating;
        });
      }
      
      // Apply sorting
      if (sortConfig.key) {
        result.sort((a, b) => {
          // Handle date fields with different names
          if (sortConfig.key === 'dateCreated') {
            const dateA = a.createdAt || a.dateCreated || a.date || 0;
            const dateB = b.createdAt || b.dateCreated || b.date || 0;
            if (dateA < dateB) {
              return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (dateA > dateB) {
              return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
          }
          
          // Handle rating fields with different names
          if (sortConfig.key === 'rating') {
            const ratingA = parseFloat(a.score || a.rating || 0);
            const ratingB = parseFloat(b.score || b.rating || 0);
            if (ratingA < ratingB) {
              return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (ratingA > ratingB) {
              return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
          }
          
          // Default sorting for other fields
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      
      setFilteredRatings(result);
    } else {
      // If no ratings, ensure filteredRatings is also empty
      setFilteredRatings([]);
    }
  }, [ratings, searchQuery, filterRating, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return { ...prevConfig, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // Render stars
  const renderStars = (rating) => {
    // Convert to number, default to 0 if invalid
    const numRating = parseFloat(rating);
    const ratingValue = !isNaN(numRating) ? numRating : 0;
    
    const stars = [];
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-gray-300" />);
      }
    }
    
    return (
      <div className="flex space-x-1">
        {stars}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Function to handle responding to a review
  const handleRespondToReview = async (ratingId, response) => {
    if (!token) {
      toast.error("You must be logged in to respond to reviews");
      return;
    }
    
    try {
      const doctorId = doctorProfile?.id || localStorage.getItem('doctorId');
      if (!doctorId) {
        toast.error("Doctor ID not found");
        return;
      }
      
      // Create the response payload
      const payload = {
        ratingId: ratingId,
        doctorId: doctorId,
        response: response
      };
      
      // Check if doctorId is in UUID format
      const isUuid = isUuidFormat(doctorId);
      let result;
      
      if (isUuid) {
        // For UUID, use the user-specific endpoint
        result = await fetch(`${backendUrl}/api/Ratings/by-user-id/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // For numeric IDs, use the regular endpoint
        result = await fetch(`${backendUrl}/api/Ratings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }
      
      if (!result.ok) {
        throw new Error('Failed to respond to review');
      }
      
      toast.success("Response submitted successfully");
      
      // Refresh the ratings list
      let response;
      if (isUuidFormat(doctorId)) {
        // If it's a UUID, use the by-user-id endpoint with path parameter
        response = await fetch(`${backendUrl}/api/Ratings/by-user-id/${doctorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        // Otherwise use the doctor endpoint with query parameter
        response = await fetch(`${backendUrl}/api/Ratings/doctor?doctorId=${doctorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        setRatings(data || []);
        processRatingsData(data);
      }
    } catch (error) {
      console.error('Error responding to review:', error);
      toast.error(error.message || "Failed to respond to review");
    }
  };
  
  // Function to mark a review as helpful
  const handleMarkReviewHelpful = async (ratingId) => {
    if (!token) {
      toast.error("You must be logged in to mark reviews as helpful");
      return;
    }
    
    try {
      const doctorId = doctorProfile?.id || localStorage.getItem('doctorId');
      
      // Check if doctorId is in UUID format
      const isUuid = isUuidFormat(doctorId);
      let result;
      
      if (isUuid) {
        // For UUID, we need to use the specific by-user-id endpoints
        result = await fetch(`${backendUrl}/api/Ratings/${ratingId}/helpful-by-user/${doctorId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        // For numeric IDs, use the regular endpoint with query parameter
        result = await fetch(`${backendUrl}/api/Ratings/${ratingId}/helpful?doctorId=${doctorId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      if (!result.ok) {
        throw new Error('Failed to mark review as helpful');
      }
      
      toast.success("Review marked as helpful");
      
      // Update the rating in the local state
      setRatings(ratings.map(rating => 
        rating.id === ratingId 
          ? { ...rating, helpfulCount: (rating.helpfulCount || 0) + 1 }
          : rating
      ));
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      toast.error(error.message || "Failed to mark review as helpful");
    }
  };
  
  // Function to report a review
  const handleReportReview = async (ratingId, reason) => {
    if (!token) {
      toast.error("You must be logged in to report reviews");
      return;
    }
    
    try {
      const doctorId = doctorProfile?.id || localStorage.getItem('doctorId');
      
      // Check if doctorId is in UUID format
      const isUuid = isUuidFormat(doctorId);
      let result;
      
      if (isUuid) {
        // For UUID, we need to use the specific by-user-id endpoints
        result = await fetch(`${backendUrl}/api/Ratings/${ratingId}/report-by-user/${doctorId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        });
      } else {
        // For numeric IDs, use the regular endpoint with query parameter
        result = await fetch(`${backendUrl}/api/Ratings/${ratingId}/report?doctorId=${doctorId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        });
      }
      
      if (!result.ok) {
        throw new Error('Failed to report review');
      }
      
      toast.success("Review reported successfully");
    } catch (error) {
      console.error('Error reporting review:', error);
      toast.error(error.message || "Failed to report review");
    }
  };

  // Helper function to sanitize review comments
  const sanitizeComment = (comment) => {
    if (!comment) return "No comment provided";
    
    // Check for inappropriate words
    const inappropriateWordPattern = /\b(f[u*]+ck|sh[i*]+t|b[i*]+tch|d[i*]+ck|a[s*]+hole|fu+u+|fu+k)\b/gi;
    
    // Replace inappropriate words with asterisks
    return comment.replace(inappropriateWordPattern, match => '*'.repeat(match.length));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Patient Ratings & Reviews</h1>
            <p className="text-slate-500">
              View and manage feedback from your patients
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setSortConfig({ key: 'createdAt', direction: 'desc' })}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 text-sm font-medium"
            >
              <FaSort className="mr-2 text-blue-600" /> Sort
            </button>
            <button 
              onClick={() => setFilterRating(0)}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 text-sm font-medium"
            >
              <FaSlidersH className="mr-2 text-blue-600" /> Filter
            </button>
          </div>
        </div>
      </div>
      
      {/* Ratings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <FaStar className="text-blue-600 text-lg" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Overall Rating</h2>
          </div>
          
          <div className="flex items-center justify-center flex-col mt-6">
            <div className="text-5xl font-bold text-slate-800 mb-2">
              {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
            </div>
            <div className="flex space-x-1 mb-2">
              {renderStars(stats.averageRating)}
            </div>
            <p className="text-slate-500 text-sm">
              Based on {stats.totalRatings} {stats.totalRatings === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>
        
        {/* Rating Distribution Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:col-span-2">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <FaChartBar className="text-blue-600 text-lg" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Rating Distribution</h2>
          </div>
          
          <div className="space-y-3 my-2">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.distribution[star] || 0;
              
              // Calculate percentage, ensure we check for zero total
              const percentage = stats.totalRatings > 0
                ? Math.round((count / stats.totalRatings) * 100)
                : 0;
              
              // Determine color based on star value
              let barColor;
              if (star >= 4) barColor = 'bg-green-400';
              else if (star === 3) barColor = 'bg-yellow-400';
              else barColor = 'bg-red-400';
              
              return (
                <div key={star} className="flex items-center">
                  <div className="w-8 text-slate-700 font-medium">{star}</div>
                  <div className="flex items-center w-6 text-yellow-400 mr-3">
                    <FaStar />
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                    <div 
                      className={`${barColor} h-2.5 rounded-full`} 
                      style={{ width: `${percentage > 0 ? Math.max(3, percentage) : 0}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-right text-slate-600 ml-2 text-sm">{count}</div>
                  <div className="w-16 text-right text-slate-500 ml-1 text-sm">({percentage}%)</div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="px-2">
                <div className="text-green-500 mb-1"><FaRegSmile className="text-xl inline-block" /></div>
                <div className="text-2xl font-semibold text-slate-800">
                  {(() => {
                    if (stats.totalRatings === 0) return '0%';
                    const positiveCount = stats.distribution[4] + stats.distribution[5];
                    return `${Math.round((positiveCount / stats.totalRatings) * 100)}%`;
                  })()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Positive</p>
              </div>
              
              <div className="px-2 border-x border-slate-100">
                <div className="text-yellow-500 mb-1"><FaRegMeh className="text-xl inline-block" /></div>
                <div className="text-2xl font-semibold text-slate-800">
                  {(() => {
                    if (stats.totalRatings === 0) return '0%';
                    const neutralCount = stats.distribution[3];
                    return `${Math.round((neutralCount / stats.totalRatings) * 100)}%`;
                  })()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Neutral</p>
              </div>
              
              <div className="px-2">
                <div className="text-red-500 mb-1"><FaRegFrown className="text-xl inline-block" /></div>
                <div className="text-2xl font-semibold text-slate-800">
                  {(() => {
                    if (stats.totalRatings === 0) return '0%';
                    const negativeCount = stats.distribution[1] + stats.distribution[2];
                    return `${Math.round((negativeCount / stats.totalRatings) * 100)}%`;
                  })()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Negative</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search reviews..." 
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onClick={() => setSearchQuery('')}
              >
                <FaTimes />
              </button>
            )}
          </div>
          
          {/* Rating Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaFilter className="text-slate-400" />
            </div>
            <select 
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              value={filterRating}
              onChange={(e) => setFilterRating(parseInt(e.target.value))}
            >
              <option value="0">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Sort Options */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {sortConfig.direction === 'asc' ? (
                <FaSortAmountUp className="text-slate-400" />
              ) : (
                <FaSortAmountDown className="text-slate-400" />
              )}
            </div>
            <select 
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              value={`${sortConfig.key}-${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split('-');
                setSortConfig({ key, direction });
              }}
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="score-desc">Highest Rating</option>
              <option value="score-asc">Lowest Rating</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reviews List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-medium text-slate-800 flex items-center">
            <FaComment className="mr-2 text-blue-600" />
            Patient Reviews {filteredRatings.length > 0 && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5">
                {filteredRatings.length}
              </span>
            )}
          </h2>
          
          <div className="text-sm text-slate-500">
            {filteredRatings.length !== ratings.length && (
              <span>
                Showing {filteredRatings.length} of {ratings.length} reviews
              </span>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4" />
            <p className="text-slate-600">Loading ratings data...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg inline-block mb-4">
              <FaTimes className="h-5 w-5 inline-block mr-2" />
              Error
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-slate-600 mt-2">Please try again later</p>
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FaComment className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-700 font-medium text-lg mb-1">No reviews found</p>
            {searchQuery || filterRating > 0 ? (
              <p className="text-slate-500">Try adjusting your filters</p>
            ) : (
              <p className="text-slate-500">You haven't received any patient reviews yet</p>
            )}
          </div>
        ) : (
          <div>
            {filteredRatings.map((rating, index) => (
              <div 
                key={rating.id || index} 
                className="p-6 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Review header with patient info */}
                  <div className="mb-4 md:mb-0 md:w-1/4 pr-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ProfilePicture
                          imageUrl={rating.patientProfilePicture}
                          type="patient"
                          className="w-12 h-12"
                          name={rating.patientName ? rating.patientName.replace(/\\/g, '') : 'Anonymous Patient'}
                        />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-slate-800 truncate">
                          {rating.patientName ? rating.patientName.replace(/\\/g, '') : 'Anonymous Patient'}
                        </h3>
                        <div className="flex items-center text-slate-500 text-sm">
                          <FaCalendarAlt className="mr-1 text-slate-400" />
                          {formatDate(rating.createdAt || rating.dateCreated || rating.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Review content */}
                  <div className="md:w-3/4">
                    <div className="flex items-center mb-2">
                      {renderStars(parseFloat(rating.score || rating.rating || 0))}
                      <span className="ml-2 text-slate-600 font-medium">
                        {parseFloat(rating.score || rating.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg mb-3">
                      {rating.comment ? (
                        <p className="text-slate-700 whitespace-pre-line" dir="auto">
                          {sanitizeComment(rating.comment)}
                        </p>
                      ) : (
                        <p className="text-slate-500 italic">
                          No comment provided
                        </p>
                      )}
                    </div>
                    
                    {/* Review actions */}
                    <div className="flex flex-wrap items-center text-sm text-slate-500 gap-3">
                      <button 
                        className="flex items-center hover:text-blue-600 py-1 px-2 rounded-md hover:bg-blue-50 transition-colors"
                        title="Thank patient for feedback"
                        onClick={() => handleMarkReviewHelpful(rating.id)}
                      >
                        <FaThumbsUp className="mr-1.5" /> 
                        Helpful 
                        {rating.helpfulCount > 0 && (
                          <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
                            {rating.helpfulCount}
                          </span>
                        )}
                      </button>
                      
                      <button 
                        className="flex items-center hover:text-red-600 py-1 px-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Report inappropriate content"
                        onClick={() => {
                          const reason = window.prompt('Please provide a reason for reporting this review:');
                          if (reason) handleReportReview(rating.id, reason);
                        }}
                      >
                        <FaFlag className="mr-1.5" /> Report
                      </button>
                      
                      <button
                        className="flex items-center hover:text-green-600 py-1 px-2 rounded-md hover:bg-green-50 transition-colors"
                        title="Respond to this review"
                        onClick={() => {
                          const response = window.prompt('Enter your response to this review:');
                          if (response) handleRespondToReview(rating.id, response);
                        }}
                      >
                        <FaComment className="mr-1.5" /> Respond
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorRatings; 