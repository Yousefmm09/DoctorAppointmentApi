import React, { forwardRef } from 'react';

/**
 * Enhanced form input component with improved focus handling
 * This component fixes the issue where typing stops and requires clicking again
 */
const FormInput = forwardRef(({
  type = 'text',
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
  autoComplete,
  min,
  max,
  step,
  required = false,
  disabled = false,
  ...props
}, ref) => {
  // Generate unique ID if not provided
  const inputId = id || `input-${name}`;
  
  // Determine input classes based on error state
  const inputClasses = `enhanced-input ${error ? 'enhanced-input-error' : ''} ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
        >
          {Icon && <Icon className="inline mr-2 text-primary" />}
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      <input
        type={type}
        name={name}
        id={inputId}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={inputClasses}
        ref={ref}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
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

FormInput.displayName = 'FormInput';

export default FormInput; 