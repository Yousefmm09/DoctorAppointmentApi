import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { FiStar, FiCalendar, FiClock, FiMapPin, FiAward, FiLogIn, FiUser } from 'react-icons/fi';

const DoctorCard = ({ doctor, delay = 0, token }) => {
  const [imageError, setImageError] = useState(false);
  
  // Use the actual doctor image URL first
  const [imageUrl, setImageUrl] = useState(doctor.imageUrl);
  const [isHovered, setIsHovered] = useState(false);

  // Generate avatar URL for fallback
  const getAvatarUrl = () => {
    const name = `${doctor.firstName || ''} ${doctor.lastName || ''}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=0D8ABC&color=fff&size=256`;
  };

  // Handle image loading errors
  const handleImageError = () => {
    console.log(`Image error for ${doctor.name}, using avatar placeholder`);
    setImageError(true);
    setImageUrl(getAvatarUrl());
  };

  // Render star ratings with better visual appearance
  const renderStarRating = (rating) => {
    return (
      <div className="flex items-center">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => {
            // Determine if this star should be full, half, or empty
            let starType = 'empty';
            if (star <= Math.floor(rating)) {
              starType = 'full';
            } else if (star - 0.5 <= rating) {
              starType = 'half';
            }
            
            return (
              <span key={star} className="text-lg flex items-center justify-center">
                {starType === 'full' && <FiStar className="text-yellow-400 fill-current" />}
                {starType === 'half' && (
                  <span className="relative">
                    <FiStar className="text-gray-300" />
                    <span className="absolute inset-0 overflow-hidden w-1/2">
                      <FiStar className="text-yellow-400 fill-current" />
                    </span>
                  </span>
                )}
                {starType === 'empty' && <FiStar className="text-gray-300" />}
              </span>
            );
          })}
        </div>
        <span className="ml-2 text-gray-700 font-medium text-sm">
          {rating}
          <span className="text-gray-500 text-xs ml-1">({doctor.ratingCount || 0})</span>
        </span>
      </div>
    );
  };

  // Generate doctor specialties pills
  const renderSpecialtyPill = (specialization) => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {specialization}
      </span>
    );
  };

  return (
    <motion.div
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -8, boxShadow: "0 12px 20px -5px rgba(59, 130, 246, 0.15)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative pb-[75%] bg-gray-100">
        <img 
          src={imageUrl} 
          alt={doctor.name}
          onError={handleImageError}
          className={`absolute w-full h-full ${imageError ? 'object-contain p-2' : 'object-cover'} object-center transition-transform duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Badges/Indicators */}
        <div className="absolute top-0 right-0 p-2 flex flex-col gap-2 items-end">
          {doctor.rating >= 4.7 && (
            <span className="bg-yellow-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md flex items-center">
              <FiAward className="mr-1" /> Top Rated
            </span>
          )}
        </div>
        
        {doctor.availableToday && (
          <span className="absolute top-0 left-0 m-2 bg-green-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md flex items-center">
            <FiClock className="mr-1" /> Available Today
          </span>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1 text-gray-800">{doctor.name}</h3>
        
        <div className="mb-3 flex flex-wrap gap-1">
          {renderSpecialtyPill(doctor.specialization)}
        </div>
        
        <div className="mb-4">
          {renderStarRating(doctor.rating)}
        </div>
        
        {/* Additional doctor info */}
        <div className="mb-4 text-sm text-gray-600">
          <div className="flex items-center mb-1">
            <FiMapPin className="mr-1.5 text-gray-400" />
            <span>{doctor.location || 'Cairo, Egypt'}</span>
          </div>
          <div className="flex items-center">
            <FiCalendar className="mr-1.5 text-gray-400" />
            <span>Available in {doctor.nextAvailable || '2 days'}</span>
          </div>
        </div>
        
        {token ? (
          // User is logged in - show direct booking button
          <Link
            to={`/appointment/book/${doctor.id}`}
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            <FiCalendar className="inline mr-2" />
            Book Appointment
          </Link>
        ) : (
          // User is not logged in - show login to book
          <div className="space-y-2">
            <Link
              to={`/all-doctors?doctor=${doctor.id}`}
              className="block w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2.5 px-4 rounded-lg transition-colors border border-blue-200"
            >
              <FiUser className="inline mr-2" />
              View Profile
            </Link>
            <Link
              to={`/login?redirect=/appointment/book/${doctor.id}`}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <FiLogIn className="inline mr-2" />
              Login to Book
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
};

DoctorCard.propTypes = {
  doctor: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    specialization: PropTypes.string.isRequired,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    ratingCount: PropTypes.number,
    imageUrl: PropTypes.string,
    availableToday: PropTypes.bool
  }).isRequired,
  delay: PropTypes.number,
  token: PropTypes.string
};

export default DoctorCard; 