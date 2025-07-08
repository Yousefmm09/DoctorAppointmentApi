import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

// Helper function for specialty icons based on specialty name
const getSpecialtyIcon = (specialtyName) => {
  const name = (specialtyName || '').toLowerCase();
  
  // Return SVG icons for better visuals
  if (name.includes('cardio')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  }
  if (name.includes('neuro')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8c3.28 0 6-2.239 6-5 0 0-1.956-3-6-3-4.045 0-6 3-6 3 0 2.761 2.72 5 6 5z" />
        <path d="M6.5 17.5L12 13l5.5 4.5" />
        <path d="M18 2h-1v6.5l4 2.5" />
        <path d="M6 2h1v6.5L3 11" />
        <path d="M12 22v-6" />
      </svg>
    );
  }
  if (name.includes('ortho')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 14v7M12 14v7M16 14v7M4 8h16M6 4h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    );
  }
  if (name.includes('pediatric') || name.includes('child')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12h6M12 9v6M12 3a4 4 0 100 8 4 4 0 000-8zM12 21v-4" />
      </svg>
    );
  }
  if (name.includes('derma') || name.includes('skin')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3a5 5 0 00-5 5v4a5 5 0 0010 0V8a5 5 0 00-5-5z" />
        <path d="M8 14v4M12 14v7M16 14v4" />
      </svg>
    );
  }
  if (name.includes('eye') || name.includes('ophthal')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      </svg>
    );
  }
  if (name.includes('gynec') || name.includes('obstet')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="7" r="5" />
        <path d="M12 13v8" />
        <path d="M9 18h6" />
      </svg>
    );
  }
  if (name.includes('psych')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 15c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z" />
        <path d="M14 16l3 6" />
        <path d="M10 16l-3 6" />
        <path d="M9 12l-5-3" />
        <path d="M15 12l5-3" />
      </svg>
    );
  }
  if (name.includes('cancer') || name.includes('oncol')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12h.001M9 7a3 3 0 013-3 3 3 0 016 0c0 1.657-1.343 3-3 3-1.3 0-2.4-.827-2.816-2" />
        <path d="M5 15a3 3 0 013-3 3 3 0 016 0 3 3 0 01-6 0m7 .879a3 3 0 115.121-2.121 3 3 0 11-5.121 2.121z" />
      </svg>
    );
  }
  if (name.includes('dental') || name.includes('teeth')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.5 3v6.5a2.5 2.5 0 01-5 0V6a3 3 0 013-3zM15.5 3v6.5a2.5 2.5 0 01-5 0V6a3 3 0 013-3zM9 12h6m-6 4h6m-6 4h6" />
      </svg>
    );
  }
  
  // Default medical icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v6M9 12h6M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
    </svg>
  );
};

const SpecialtyCard = ({ specialty, index = 0, customImageUrl = null }) => {
  const navigate = useNavigate();

  // Handle specialty icon display
  const renderIcon = () => {
    if (customImageUrl) {
      return (
        <img 
          src={customImageUrl} 
          alt={specialty.name || 'Medical specialty'} 
          className="w-8 h-8 object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            // Show fallback icon
            const fallbackIcon = document.createElement('div');
            fallbackIcon.className = 'fallback-icon';
            fallbackIcon.appendChild(getSpecialtyIcon(specialty.name));
            e.target.parentNode.appendChild(fallbackIcon);
          }}
        />
      );
    }
    return getSpecialtyIcon(specialty.name);
  };
  
  return (
    <motion.div
      key={specialty.id || index}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 overflow-hidden group"
      whileHover={{ 
        y: -8, 
        boxShadow: "0 12px 25px -5px rgba(59, 130, 246, 0.15)",
        transition: { duration: 0.3 }
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.5 }}
      onClick={() => {
        // Navigate to the public doctors route with the specialty as a query parameter
        navigate(`/doctors?specialty=${encodeURIComponent(specialty.name)}`);
      }}
    >
      <div className="p-6 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors duration-300 text-blue-600 group-hover:text-blue-700 group-hover:scale-110 transform transition-transform">
          {renderIcon()}
        </div>
        <h3 className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{specialty.name}</h3>
        <div className="w-0 group-hover:w-16 h-0.5 bg-blue-500 mx-auto mt-2 transition-all duration-300"></div>
      </div>
    </motion.div>
  );
};

SpecialtyCard.propTypes = {
  specialty: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    iconUrl: PropTypes.string
  }).isRequired,
  index: PropTypes.number,
  customImageUrl: PropTypes.string
};

export default SpecialtyCard; 