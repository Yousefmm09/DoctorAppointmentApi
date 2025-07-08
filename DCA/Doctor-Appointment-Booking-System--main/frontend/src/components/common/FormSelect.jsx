import React, { forwardRef } from 'react';

/**
 * Enhanced form select component with improved focus handling
 * This component fixes focus issues in select dropdowns
 */
const FormSelect = forwardRef(({
  name,
  id,
  value,
  onChange,
  onBlur,
  options = [],
  label,
  error,
  icon: Icon,
  className = '',
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  ...props
}, ref) => {
  // Generate unique ID if not provided
  const selectId = id || `select-${name}`;
  
  // Determine select classes based on error state
  const selectClasses = `enhanced-input ${error ? 'enhanced-input-error' : ''} ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
        >
          {Icon && <Icon className="inline mr-2 text-primary" />}
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      <select
        name={name}
        id={selectId}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={selectClasses}
        ref={ref}
        required={required}
        disabled={disabled}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export default FormSelect; 