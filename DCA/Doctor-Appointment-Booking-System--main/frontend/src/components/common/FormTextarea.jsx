import React, { forwardRef } from 'react';

/**
 * Enhanced form textarea component with improved focus handling
 * This component fixes the issue where typing stops and requires clicking again
 */
const FormTextarea = forwardRef(({
  name,
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  label,
  error,
  icon: Icon,
  className = '',
  rows = 4,
  required = false,
  disabled = false,
  ...props
}, ref) => {
  // Generate unique ID if not provided
  const textareaId = id || `textarea-${name}`;
  
  // Determine textarea classes based on error state
  const textareaClasses = `enhanced-input ${error ? 'enhanced-input-error' : ''} ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
        >
          {Icon && <Icon className="inline mr-2 text-primary" />}
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      <textarea
        name={name}
        id={textareaId}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={textareaClasses}
        ref={ref}
        rows={rows}
        required={required}
        disabled={disabled}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea; 