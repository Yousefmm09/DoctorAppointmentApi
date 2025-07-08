import React, { useState, useEffect, useContext } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { 
  FaCalendarAlt, 
  FaPlus, 
  FaClock, 
  FaTrash, 
  FaSave, 
  FaSpinner,
  FaEdit,
  FaCheck,
  FaTimesCircle,
  FaRegClock,
  FaExclamationTriangle
} from 'react-icons/fa';

const DoctorAvailability = () => {
  const { doctorProfile } = useContext(DoctorContext);
  const { backendUrl, token } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  
  // Form data for new time slot
  const [newTimeSlot, setNewTimeSlot] = useState({
    startTime: '09:00',
    endTime: '10:00',
    date: new Date().toISOString().split('T')[0]
  });

  // Days of the week for the calendar
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Helper function to check if a string is in UUID format
  const isUuidFormat = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Get current week dates
  const getWeekDates = (date) => {
    const selectedDate = new Date(date);
    const day = selectedDate.getDay(); // 0-6 (Sunday-Saturday)
    
    // Start from Sunday of the current week
    const startDate = new Date(selectedDate);
    startDate.setDate(selectedDate.getDate() - day);
    
    // Generate 7 days starting from Sunday
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      weekDates.push({
        date: currentDate.toISOString().split('T')[0],
        dayName: daysOfWeek[i],
        dayNumber: currentDate.getDate(),
        isToday: currentDate.toDateString() === new Date().toDateString(),
        isSelected: currentDate.toDateString() === new Date(selectedDate).toDateString()
      });
    }
    
    return weekDates;
  };
  
  const [weekDates, setWeekDates] = useState(getWeekDates(selectedDate));
  
  // Update week dates when selected date changes
  useEffect(() => {
    setWeekDates(getWeekDates(selectedDate));
  }, [selectedDate]);

  // Fetch doctor's availability
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      try {
        const doctorId = doctorProfile?.id || localStorage.getItem('doctorId');
        
        if (!doctorId) {
          throw new Error('Doctor ID not found');
        }
        
        // Format date as ISO string for API
        const formattedDate = new Date(selectedDate).toISOString();
        
        // Check if doctorId is in UUID format
        const isUuid = isUuidFormat(doctorId);
        let endpoint;
        
        if (isUuid) {
          // For UUID, use the by-user-id endpoint pattern
          endpoint = `${backendUrl}/api/Appointment/available-slots-by-user/${doctorId}?date=${formattedDate}`;
        } else {
          // For numeric IDs, use the regular endpoint with query parameter
          endpoint = `${backendUrl}/api/Appointment/available-slots?doctorId=${doctorId}&date=${formattedDate}`;
        }
        
        // Use the correct endpoint with properly formatted parameters
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch availability data');
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Transform the data to match the component's expected format
        const formattedData = Array.isArray(data) ? data.map(slot => {
          // Ensure we extract time correctly
          const startTime = slot.startTime || (slot.time && slot.time.split('-')[0]?.trim());
          const endTime = slot.endTime || (slot.time && slot.time.split('-')[1]?.trim());
          
          return {
            id: slot.id || `temp-${Date.now()}-${Math.random()}`,
            doctorId: doctorId,
            date: slot.date || slot.appointmentDate || selectedDate,
            startTime: startTime || '09:00',
            endTime: endTime || '10:00',
            isBooked: slot.isBooked || slot.status === 'booked' || false,
            // Keep the original data for debugging
            originalData: { ...slot }
          };
        }) : [];
        
        console.log('Formatted availability data:', formattedData);
        setAvailabilityData(formattedData);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchAvailability();
    }
  }, [backendUrl, token, doctorProfile, selectedDate]);

  // Handler for navigating to the previous week
  const goToPreviousWeek = () => {
    const prevWeekDate = new Date(weekDates[0].date);
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    setSelectedDate(prevWeekDate.toISOString().split('T')[0]);
  };

  // Handler for navigating to the next week
  const goToNextWeek = () => {
    const nextWeekDate = new Date(weekDates[0].date);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    setSelectedDate(nextWeekDate.toISOString().split('T')[0]);
  };

  // Handler for selecting a date from the calendar
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setNewTimeSlot(prev => ({ ...prev, date }));
  };

  // Handler for input changes in the add/edit form
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Ensure empty values don't cause input to become uncontrolled
    let finalValue = value;
    
    // Set default values if cleared
    if (value === '' || value === null || value === undefined) {
      if (name === 'date') {
        finalValue = new Date().toISOString().split('T')[0];
      } else if (name === 'startTime') {
        finalValue = '09:00';
      } else if (name === 'endTime') {
        finalValue = '10:00';
      }
    }
    
    // Update the form state
    setNewTimeSlot(prev => ({ ...prev, [name]: finalValue }));
  };
  
  // Handler for adding a new time slot
  const handleAddTimeSlot = async (e) => {
    e.preventDefault();
    
    if (new Date(`${newTimeSlot.date}T${newTimeSlot.endTime}`) <= new Date(`${newTimeSlot.date}T${newTimeSlot.startTime}`)) {
      toast.error('End time must be after start time');
      return;
    }
    
    setSaving(true);
    
    try {
      const doctorId = doctorProfile?.id || localStorage.getItem('doctorId');
      
      if (!doctorId) {
        throw new Error('Doctor ID not found');
      }
      
      // Check if doctorId is in UUID format
      const isUuid = isUuidFormat(doctorId);
      let checkEndpoint;
      
      if (isUuid) {
        // For UUID, use the by-user-id endpoint pattern
        checkEndpoint = `${backendUrl}/api/Appointment/check-availability-by-user/${doctorId}?date=${newTimeSlot.date}&startTime=${newTimeSlot.startTime}&endTime=${newTimeSlot.endTime}`;
      } else {
        // For numeric IDs, use the regular endpoint with query parameter
        checkEndpoint = `${backendUrl}/api/Appointment/check-availability?doctorId=${doctorId}&date=${newTimeSlot.date}&startTime=${newTimeSlot.startTime}&endTime=${newTimeSlot.endTime}`;
      }
      
      // Use the check-availability endpoint first to validate the slot
      const checkResponse = await fetch(checkEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!checkResponse.ok) {
        throw new Error('This time slot conflicts with existing slots');
      }
      
      const checkResult = await checkResponse.json();
      
      if (checkResult && checkResult.isAvailable === false) {
        toast.error('This time slot is not available. It may conflict with existing appointments.');
        return;
      }
      
      // Proceed with creating or updating the slot
      const payload = {
        doctorId,
        date: newTimeSlot.date,
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime
      };
      
      // Determine the appropriate endpoint based on UUID vs numeric ID
      let url;
      if (editingSlotId) {
        url = isUuid
          ? `${backendUrl}/api/Appointment/update-slot-by-user/${editingSlotId}`
          : `${backendUrl}/api/Appointment/update-slot/${editingSlotId}`;
      } else {
        url = isUuid
          ? `${backendUrl}/api/Appointment/create-slot-by-user`
          : `${backendUrl}/api/Appointment/create-slot`;
      }
      
      const method = editingSlotId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${editingSlotId ? 'update' : 'add'} availability`);
      }
      
      // Try to get the result
      let result;
      try {
        result = await response.json();
      } catch (err) {
        // Handle case where response might not be JSON
        console.warn('Response may not contain JSON data');
        result = { success: true };
      }
      
      // Update local state
      if (editingSlotId) {
        setAvailabilityData(availabilityData.map(slot => 
          slot.id === editingSlotId 
            ? { ...slot, date: newTimeSlot.date, startTime: newTimeSlot.startTime, endTime: newTimeSlot.endTime }
            : slot
        ));
        setEditingSlotId(null);
      } else {
        // Add the new slot to the list
        const newSlot = {
          id: result.id || `temp-${Date.now()}`,
          doctorId,
          date: newTimeSlot.date,
          startTime: newTimeSlot.startTime,
          endTime: newTimeSlot.endTime,
          isBooked: false
        };
        setAvailabilityData([...availabilityData, newSlot]);
      }
      
      toast.success(`Time slot ${editingSlotId ? 'updated' : 'added'} successfully`);
      
      // Reset form
      setNewTimeSlot({
        startTime: '09:00',
        endTime: '10:00',
        date: selectedDate
      });
      setShowAddForm(false);
      
      // Refresh the availability data
      const fetchAvailability = async () => {
        try {
          // Use the correct endpoint from Appointment controller instead of Doctor controller
          const response = await fetch(`${backendUrl}/api/Appointment/available-slots?doctorId=${doctorId}&date=${selectedDate}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch availability data');
          }
          
          const data = await response.json();
          
          // Transform the data to match the component's expected format if needed
          const formattedData = Array.isArray(data) ? data.map(slot => ({
            id: slot.id || `temp-${Date.now()}-${Math.random()}`,
            doctorId: doctorId,
            date: slot.date || slot.appointmentDate || selectedDate,
            startTime: slot.startTime || slot.start || '09:00',
            endTime: slot.endTime || slot.end || '10:00',
            isBooked: slot.isBooked || slot.status === 'booked' || false
          })) : [];
          
          console.log('Formatted availability data:', formattedData);
          setAvailabilityData(formattedData);
        } catch (err) {
          console.error('Error refreshing availability:', err);
        }
      };
      
      fetchAvailability();
    } catch (err) {
      console.error('Error managing time slot:', err);
      toast.error(err.message || 'Failed to manage time slot');
    } finally {
      setSaving(false);
    }
  };
  
  // Handler for deleting a time slot
  const handleDeleteTimeSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }
    
    try {
      const doctorId = doctorProfile?.id || localStorage.getItem('doctorId');
      
      if (!doctorId) {
        throw new Error('Doctor ID not found');
      }
      
      // Check if doctorId is in UUID format
      const isUuid = isUuidFormat(doctorId);
      let deleteEndpoint;
      
      if (isUuid) {
        // For UUID, use the by-user-id endpoint pattern
        deleteEndpoint = `${backendUrl}/api/Appointment/delete-slot-by-user/${slotId}`;
      } else {
        // For numeric IDs, use the regular endpoint
        deleteEndpoint = `${backendUrl}/api/Appointment/delete-slot/${slotId}`;
      }
      
      // Use the appropriate endpoint for deleting slots
      const response = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete time slot');
      }
      
      // Remove from local state
      setAvailabilityData(availabilityData.filter(slot => slot.id !== slotId));
      toast.success('Time slot deleted successfully');
    } catch (err) {
      console.error('Error deleting time slot:', err);
      toast.error(err.message);
    }
  };
  
  // Handler for editing a time slot
  const handleEditTimeSlot = (slot) => {
    setNewTimeSlot({
      startTime: slot.startTime || '09:00',
      endTime: slot.endTime || '10:00',
      date: slot.date || new Date().toISOString().split('T')[0]
    });
    setEditingSlotId(slot.id);
    setShowAddForm(true);
    setSelectedDate(slot.date || selectedDate);
  };
  
  // Format the time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // Handle different time formats
      if (timeString.includes('T')) {
        // ISO format (e.g. "2023-05-13T09:00:00")
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return timeString; // Return original if invalid
        
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else if (timeString.includes(':')) {
        // Simple time string (e.g. "09:00")
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      
      // Default case - just return the original string
      return timeString;
    } catch (error) {
      console.error('Error formatting time:', error, timeString);
      return timeString || 'N/A';
    }
  };
  
  // Checking if a date has any time slots
  const hasTimeSlots = (date) => {
    return availabilityData.some(slot => slot.date === date);
  };
  
  // Filter time slots for selected date
  const filteredTimeSlots = availabilityData.filter(slot => 
    slot.date === selectedDate
  ).sort((a, b) => {
    // Sort by start time - add null checks to prevent errors
    const startTimeA = a.startTime || '';
    const startTimeB = b.startTime || '';
    return startTimeA.localeCompare(startTimeB);
  });

  // Deduplicate slots that have the same start/end times
  const deduplicatedTimeSlots = filteredTimeSlots.reduce((unique, slot) => {
    // Create a key based on startTime and endTime to identify duplicates
    const key = `${slot.startTime}-${slot.endTime}`;
    
    // Only add if this time slot doesn't already exist in our array
    if (!unique.some(item => `${item.startTime}-${item.endTime}` === key)) {
      unique.push(slot);
    }
    return unique;
  }, []);

  // Pagination for time slots
  const [currentPage, setCurrentPage] = useState(1);
  const slotsPerPage = 6;
  const totalPages = Math.ceil(deduplicatedTimeSlots.length / slotsPerPage);
  
  // Get current slots for pagination
  const getCurrentSlots = () => {
    const indexOfLastSlot = currentPage * slotsPerPage;
    const indexOfFirstSlot = indexOfLastSlot - slotsPerPage;
    return deduplicatedTimeSlots.slice(indexOfFirstSlot, indexOfLastSlot);
  };
  
  const currentSlots = getCurrentSlots();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Availability Management</h1>
          <p className="text-gray-600 mt-1">
            Set your available time slots for patient appointments
          </p>
        </div>
        
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingSlotId(null);
            setNewTimeSlot({
              startTime: '09:00',
              endTime: '10:00',
              date: selectedDate
            });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow flex items-center transition-colors"
        >
          <FaPlus className="mr-2" /> Add New Time Slot
        </button>
      </div>
      
      {/* Weekly Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <button
            onClick={goToPreviousWeek}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            &larr; Previous Week
          </button>
          
          <h2 className="text-lg font-medium text-gray-800 flex items-center">
            <FaCalendarAlt className="mr-2 text-blue-600" /> 
            {new Date(weekDates[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
            {new Date(weekDates[6].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
          
          <button
            onClick={goToNextWeek}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Next Week &rarr;
          </button>
        </div>
        
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDates.map((day, index) => (
            <div 
              key={index}
              onClick={() => handleDateSelect(day.date)}
              className={`p-4 text-center cursor-pointer transition-colors ${
                day.isSelected 
                  ? 'bg-blue-50 border-b-2 border-blue-600' 
                  : day.isToday
                  ? 'bg-yellow-50'
                  : 'hover:bg-gray-50'
              } ${hasTimeSlots(day.date) ? 'font-semibold' : ''}`}
            >
              <div className="text-sm font-medium text-gray-500">{day.dayName}</div>
              <div className={`text-lg mt-1 ${
                day.isSelected 
                  ? 'text-blue-700' 
                  : day.isToday
                  ? 'text-yellow-700'
                  : 'text-gray-800'
              }`}>
                {day.dayNumber}
              </div>
              {hasTimeSlots(day.date) && (
                <div className="mt-2">
                  <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Add/Edit Time Slot Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <FaClock className="mr-2 text-blue-600" /> 
              {editingSlotId ? 'Edit Time Slot' : 'Add New Time Slot'}
            </h3>
          </div>
          
          <form onSubmit={handleAddTimeSlot} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaCalendarAlt className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    value={newTimeSlot.date || ''}
                    onChange={handleInputChange}
                    className="pl-10 w-full rounded-lg border border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaRegClock className="text-gray-400" />
                  </div>
                  <input
                    type="time"
                    name="startTime"
                    value={newTimeSlot.startTime || '09:00'}
                    onChange={handleInputChange}
                    className="pl-10 w-full rounded-lg border border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaRegClock className="text-gray-400" />
                  </div>
                  <input
                    type="time"
                    name="endTime"
                    value={newTimeSlot.endTime || '10:00'}
                    onChange={handleInputChange}
                    className="pl-10 w-full rounded-lg border border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSlotId(null);
                }}
                className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" /> {editingSlotId ? 'Update Slot' : 'Add Slot'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Time Slots for Selected Date */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-800 flex items-center">
            <FaClock className="mr-2 text-blue-600" /> 
            Available Time Slots for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading availability data...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <FaExclamationTriangle className="h-8 w-8 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-600 mt-2">Please try again later</p>
          </div>
        ) : deduplicatedTimeSlots.length === 0 ? (
          <div className="p-8 text-center">
            <FaRegClock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">No time slots available for this date</p>
            <p className="text-gray-500 mt-2">Click "Add New Time Slot" to add availability</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {currentSlots.map(slot => (
                <div key={slot.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full p-2 mr-3">
                        <FaClock className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {formatTime(slot.startTime) !== 'N/A' && formatTime(slot.endTime) !== 'N/A' ? 
                            `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}` : 
                            slot.timeDisplay || 'Time slot'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {slot.date ? new Date(slot.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : 'Date not specified'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditTimeSlot(slot)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteTimeSlot(slot.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  
                  {slot.isBooked && (
                    <div className="mt-3 p-2 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 flex items-center">
                      <FaExclamationTriangle className="mr-2 text-yellow-600" />
                      This slot is booked by a patient
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center space-x-1">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    &laquo; Prev
                  </button>
                  
                  <div className="px-3 py-1 text-blue-600 font-medium">
                    {currentPage} of {totalPages}
                  </div>
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Next &raquo;
                  </button>
                </nav>
              </div>
            )}
            
            {/* Counter showing total slots */}
            <div className="text-center mt-4 text-sm text-gray-500">
              Showing {Math.min(currentSlots.length, slotsPerPage)} of {deduplicatedTimeSlots.length} time slots
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorAvailability; 