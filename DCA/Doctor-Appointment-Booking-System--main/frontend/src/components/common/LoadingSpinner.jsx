import React from 'react';

/**
 * LoadingSpinner component for displaying loading states
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner ('sm', 'md', 'lg')
 * @param {string} props.color - Color of the spinner ('primary', 'secondary', 'white')
 * @param {string} props.text - Optional text to display below spinner
 * @param {boolean} props.fullPage - Whether to display as a full page overlay
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  text, 
  fullPage = false 
}) => {
  // Determine size classes
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  // Determine color classes
  const colorClasses = {
    primary: 'text-indigo-600',
    secondary: 'text-emerald-600',
    white: 'text-white',
  };
  
  const spinnerClasses = `animate-spin ${sizeClasses[size]} ${colorClasses[color]}`;
  
  const spinnerSvg = (
    <svg className={spinnerClasses} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
  
  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          {spinnerSvg}
          {text && <p className="mt-4 text-white font-medium">{text}</p>}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-4">
      {spinnerSvg}
      {text && <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner; 