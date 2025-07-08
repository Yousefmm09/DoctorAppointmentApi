import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiVideo,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import ProfilePicture from './ProfilePicture';

const AppointmentDetailsModal = ({
  appointment,
  onClose,
  onStatusChange,
  onStartChat,
  onStartCall,
  onReschedule,
  onDelete,
  isDoctor = false
}) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return <FiCalendar className="w-4 h-4" />;
      case 'completed':
        return <FiCheck className="w-4 h-4" />;
      case 'cancelled':
        return <FiX className="w-4 h-4" />;
      case 'confirmed':
        return <FiCheck className="w-4 h-4" />;
      default:
        return <FiAlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Appointment Details</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              {/* Patient/Doctor Info */}
              <div className="flex items-start mb-6">
                <ProfilePicture
                  type={isDoctor ? 'patient' : 'doctor'}
                  imageUrl={isDoctor ? appointment.patientProfilePicture : appointment.doctorProfilePicture}
                  name={isDoctor ? appointment.patientName : appointment.doctorName}
                  className="w-16 h-16 rounded-full"
                />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {isDoctor ? appointment.patientName : appointment.doctorName}
                  </h3>
                  <p className="text-gray-600">
                    {isDoctor ? 'Patient' : appointment.specialization}
                  </p>
                  <div className="flex items-center mt-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      <span className="mr-1.5">{getStatusIcon(appointment.status)}</span>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Appointment Time & Location */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FiCalendar className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Date & Time</h4>
                    <p className="text-gray-600">
                      {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-gray-600">
                      {appointment.startTime} - {appointment.endTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FiMapPin className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Location</h4>
                    <p className="text-gray-600">{appointment.location || 'Clinic Address'}</p>
                  </div>
                </div>

                {appointment.phone && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FiPhone className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">Phone</h4>
                      <p className="text-gray-600">{appointment.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Reason for Visit */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Reason for Visit</h4>
                <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                  {appointment.reason || 'No reason provided'}
                </p>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{appointment.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {appointment.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => onStatusChange('confirmed')}
                      className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <FiCheck className="mr-2" />
                      Confirm Appointment
                    </button>
                    <button
                      onClick={() => onStatusChange('cancelled')}
                      className="w-full flex items-center justify-center px-4 py-2 border border-red-600 rounded-lg shadow-sm text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiX className="mr-2" />
                      Cancel Appointment
                    </button>
                  </>
                )}

                {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                  <div className="flex gap-3">
                    {onStartChat && (
                      <button
                        onClick={onStartChat}
                        className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <FiMessageSquare className="mr-2" />
                        Chat
                      </button>
                    )}
                    {onStartCall && (
                      <button
                        onClick={onStartCall}
                        className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <FiVideo className="mr-2" />
                        Video Call
                      </button>
                    )}
                  </div>
                )}

                {onReschedule && appointment.status !== 'completed' && (
                  <button
                    onClick={onReschedule}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FiEdit2 className="mr-2" />
                    Reschedule
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FiTrash2 className="mr-2" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AppointmentDetailsModal; 