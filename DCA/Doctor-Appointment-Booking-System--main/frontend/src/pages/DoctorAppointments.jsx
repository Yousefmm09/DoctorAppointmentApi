import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiCheck, FiX, FiMessageSquare, FiPhone, FiVideo, FiRefreshCw, FiList, FiGrid, FiDownload, FiSearch, FiMoreVertical } from 'react-icons/fi';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { toast } from 'react-toastify';
import ProfilePicture from '../components/ProfilePicture';
import AppointmentCalendar from '../components/AppointmentCalendar';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import VideoCall from '../components/VideoCall';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../services/appointmentService';

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ 
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [view, setView] = useState('list');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    upcoming: 0
  });
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeCallAppointmentId, setActiveCallAppointmentId] = useState(null);
  const navigate = useNavigate();

  // Status options with colors and labels
  const statusOptions = {
    scheduled: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    noShow: { color: 'bg-gray-100 text-gray-800', label: 'No Show' }
  };

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, [dateRange, selectedStatus]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getDoctorAppointments();
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await appointmentService.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      toast.success('Appointment status updated');
      fetchAppointments();
      fetchStats();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    }
  };

  const handleStartChat = (patientId) => {
    navigate(`/doctor/chat/${patientId}`);
  };

  const handleStartCall = (appointmentId) => {
    setActiveCallAppointmentId(appointmentId);
    setShowVideoCall(true);
  };

  const handleEndCall = () => {
    setShowVideoCall(false);
    setActiveCallAppointmentId(null);
  };

  const handleReschedule = async (appointmentId, newDate, newTime) => {
    try {
      await appointmentService.rescheduleAppointment(appointmentId, newDate, newTime);
      toast.success('Appointment rescheduled successfully');
      fetchAppointments();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }
  };

  const handleDelete = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentService.deleteAppointment(appointmentId);
        toast.success('Appointment cancelled successfully');
        fetchAppointments();
        setShowDetailsModal(false);
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        toast.error('Failed to cancel appointment');
      }
    }
  };

  const handleRefresh = () => {
    fetchAppointments();
    toast.success('Appointments refreshed');
  };

  const handleExport = () => {
    // Implement export functionality
    toast.info('Export feature coming soon');
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
    const matchesDateRange = (!dateRange.from || new Date(appointment.date) >= new Date(dateRange.from)) &&
                           (!dateRange.to || new Date(appointment.date) <= new Date(dateRange.to));
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">Total</div>
        <div className="text-2xl font-semibold">{stats.total}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-green-500">Completed</div>
        <div className="text-2xl font-semibold">{stats.completed}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-blue-500">Upcoming</div>
        <div className="text-2xl font-semibold">{stats.upcoming}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-red-500">Cancelled</div>
        <div className="text-2xl font-semibold">{stats.cancelled}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">No Show</div>
        <div className="text-2xl font-semibold">{stats.noShow}</div>
      </div>
    </div>
  );

  const renderAppointmentRow = (appointment) => (
    <tr key={appointment.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <ProfilePicture
              type="patient"
              name={appointment.patientName}
              className="h-10 w-10"
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
            <div className="text-sm text-gray-500">{appointment.email || 'No email'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{format(new Date(appointment.date), 'MMM dd, yyyy')}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{appointment.time || 'N/A'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          Scheduled
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => handleStartCall(appointment.id)}
            className="inline-flex items-center p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full"
            title="Start video call"
          >
            <FiVideo className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewDetails(appointment)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View Details
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="flex-1 bg-gray-50">
      {showVideoCall ? (
        <div className="fixed inset-0 z-50 bg-gray-900">
          <VideoCall
            appointmentId={activeCallAppointmentId}
            onEnd={handleEndCall}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <h1 className="text-xl text-gray-800">Welcome, Dr. nader mohamed</h1>
            <p className="text-sm text-gray-500">Sunday, May 25, 2025</p>
          </div>

          {/* Appointments Section */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Appointments</h2>
                <p className="text-sm text-gray-500">Manage your patient appointments</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Export
                </button>
                <div className="flex border border-gray-200 rounded-md">
                  <button
                    onClick={() => setView('list')}
                    className={`p-2 ${view === 'list' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                  >
                    <FiList className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className={`p-2 ${view === 'calendar' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                  >
                    <FiCalendar className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search patient name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">From</span>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">To</span>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 mb-4">
              1 appointment found
            </div>

            {/* Updated Table Row with Video Call Button */}
            <div className="bg-white rounded-md shadow-sm">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Patient
                        <FiUser className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Date
                        <FiCalendar className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Time
                        <FiClock className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Status
                        <FiCheck className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(appointment => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-800 text-sm font-medium">
                            YM
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                            <div className="text-sm text-gray-500">{appointment.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {format(new Date(appointment.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {appointment.time}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {appointment.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleStartCall(appointment.id)}
                            className="inline-flex items-center p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Start video call"
                          >
                            <FiVideo className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewDetails(appointment)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500">
              © 2025 MedConnect Doctor Portal. All rights reserved.
            </div>

            {/* Appointment Details Modal */}
            {showDetailsModal && selectedAppointment && (
              <AppointmentDetailsModal
                appointment={selectedAppointment}
                onClose={() => {
                  setShowDetailsModal(false);
                  setSelectedAppointment(null);
                }}
                onStartCall={handleStartCall}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorAppointments; 