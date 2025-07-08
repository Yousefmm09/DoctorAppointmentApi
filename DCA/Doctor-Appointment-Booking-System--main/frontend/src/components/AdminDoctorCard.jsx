import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { FaUserMd, FaStethoscope, FaPhone, FaEnvelope, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { getProfileImageUrl } from '../utils/imageHelper';

const AdminDoctorCard = ({ 
  doctor, 
  onViewDetails, 
  onDelete,
  onEdit,
  showControls = true 
}) => {
  const [imageError, setImageError] = useState(false);

  // Handle image loading errors
  const handleImageError = (e) => {
    e.target.onerror = null;
    setImageError(true);
    // Try to load from placeholder
    e.target.src = "/assets/placeholder-doctor.png";
    // If that fails, use a generated avatar
    e.target.onerror = () => {
      e.target.src = getAvatarUrl(doctor);
    };
  };

  // Generate a consistent avatar for the doctor
  const getAvatarUrl = (doctor) => {
    const name = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Doctor';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=256`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
    >
      <div className="relative">
        {/* Doctor image with gradient overlay */}
        <div className="h-48 bg-gradient-to-r from-blue-600 to-blue-800 relative overflow-hidden">
          {!imageError ? (
            <img 
              src={getProfileImageUrl(doctor.profilePicture || doctor.imageUrl, 'doctor', doctor.id)}
              alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
              className="w-full h-full object-cover mix-blend-overlay opacity-85"
              onError={handleImageError}
            />
          ) : (
            <img 
              src={getAvatarUrl(doctor)}
              alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
              className="w-full h-full object-cover mix-blend-soft-light opacity-40"
            />
          )}
          
          {/* Dark gradient overlay at bottom for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
          
          {/* Doctor name and specialty positioned at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <h3 className="text-xl font-bold text-white mb-1">
              Dr. {doctor.firstName} {doctor.lastName}
            </h3>
            <div className="flex items-center justify-between">
              <span className="flex items-center text-white/90 text-sm">
                <FaStethoscope className="mr-1.5 w-3.5 h-3.5" />
                {doctor.specialization || 'Specialist'}
              </span>
              
              {/* Doctor status badge */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                doctor.isAvailable 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {doctor.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Contact information */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-700">
            <FaPhone className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm">{doctor.phoneNumber || doctor.phone || 'No phone number'}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <FaEnvelope className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm truncate max-w-[220px]">{doctor.email || 'No email'}</span>
          </div>
        </div>
        
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <span className="text-sm text-gray-600">Fee</span>
            <p className="text-lg font-semibold text-blue-700">${parseFloat(doctor.currentFee || 0).toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <span className="text-sm text-gray-600">Appts</span>
            <p className="text-lg font-semibold text-blue-700">{doctor.appointmentCount || 0}</p>
          </div>
        </div>
        
        {/* Controls */}
        {showControls && (
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <button 
              onClick={() => onViewDetails(doctor)}
              className="flex items-center justify-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FaEye className="mr-1.5 w-3.5 h-3.5" />
              <span className="text-sm font-medium">View</span>
            </button>
            
            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(doctor)}
                className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FaEdit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(doctor.id)}
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

AdminDoctorCard.propTypes = {
  doctor: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    specialization: PropTypes.string,
    profilePicture: PropTypes.string,
    imageUrl: PropTypes.string,
    phoneNumber: PropTypes.string,
    phone: PropTypes.string,
    email: PropTypes.string,
    currentFee: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isAvailable: PropTypes.bool,
    appointmentCount: PropTypes.number
  }).isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  showControls: PropTypes.bool
};

export default AdminDoctorCard; 