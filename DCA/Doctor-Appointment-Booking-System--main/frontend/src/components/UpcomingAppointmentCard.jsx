import React from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiClock, FiArrowRight, FiAlertCircle, FiCheckCircle, FiPhone } from 'react-icons/fi';
import { formatDate } from '../utils/dateUtils';

const UpcomingAppointmentCard = ({ appointment, loading, showActions = true }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointment</h2>
          </div>
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointment</h2>
            <Link to="/doctors" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
              Find Doctors <FiArrowRight className="ml-1" />
            </Link>
          </div>
          <div className="text-center py-8 border-t border-gray-100">
            <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 mb-4">No upcoming appointments.</p>
            <Link 
              to="/doctors"
              className="inline-flex items-center justify-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book an Appointment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Format date
  const appointmentDate = new Date(appointment.date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Status indicator
  const getStatusIndicator = () => {
    const status = appointment.status || 'Scheduled';
    
    switch(status.toLowerCase()) {
      case 'completed':
        return (
          <div className="flex items-center text-green-600">
            <FiCheckCircle className="mr-1" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center text-red-600">
            <FiAlertCircle className="mr-1" />
            <span className="text-sm font-medium">Cancelled</span>
          </div>
        );
      case 'confirmed':
        return (
          <div className="flex items-center text-blue-600">
            <FiCheckCircle className="mr-1" />
            <span className="text-sm font-medium">Confirmed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-yellow-600">
            <FiClock className="mr-1" />
            <span className="text-sm font-medium">Scheduled</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointment</h2>
          <Link to="/my-appointments" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
            All Appointments <FiArrowRight className="ml-1" />
          </Link>
        </div>
        
        <div className="border-t border-gray-100 pt-4">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-800 mb-1">
                {appointment.doctorName}
              </h3>
              <p className="text-gray-600 mb-3">{appointment.specialty}</p>
              
              <div className="flex items-center text-gray-500 mb-2">
                <FiCalendar className="mr-2" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center text-gray-500 mb-3">
                <FiClock className="mr-2" />
                <span>{appointment.time}</span>
              </div>

              {getStatusIndicator()}
            </div>
            
            {showActions && (
              <div className="mt-4 md:mt-0 space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row">
                {appointment.id && !appointment.isExample && (
                  <Link 
                    to={`/appointment/details/${appointment.id}`}
                    className="inline-flex items-center justify-center px-5 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    View Details <FiArrowRight className="ml-2" />
                  </Link>
                )}
                
                <a 
                  href="tel:+1234567890"
                  className="inline-flex items-center justify-center px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FiPhone className="mr-2" />
                  Contact Clinic
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingAppointmentCard; 