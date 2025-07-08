import React, { useEffect, useState, useContext } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { FaSearch, FaFilter, FaCalendarAlt, FaEye, FaUserMd, FaUserInjured, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AllAppointments = () => {
  const { getAllAppointments, cancelAppointment, isAuthenticated } = useContext(AdminContext);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const data = await getAllAppointments();
        if (data) {
          setAppointments(data);
          setFilteredAppointments(data);
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [getAllAppointments, isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [search, filterStatus, filterDate, appointments]);

  const applyFilters = () => {
    let filtered = [...appointments];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        appointment =>
          appointment.patientName?.toLowerCase().includes(searchLower) ||
          appointment.doctorName?.toLowerCase().includes(searchLower) ||
          appointment.clinicName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(appointment => appointment.status === filterStatus);
    }

    // Apply date filter
    if (filterDate) {
      const selectedDate = new Date(filterDate).toDateString();
      filtered = filtered.filter(
        appointment => new Date(appointment.appointmentDate).toDateString() === selectedDate
      );
    }

    setFilteredAppointments(filtered);
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      setCancelLoading(true);
      const success = await cancelAppointment(appointmentId);
      if (success) {
        // Update the local state to reflect cancellation
        setAppointments(prevAppointments =>
          prevAppointments.map(app =>
            app.id === appointmentId ? { ...app, status: 'Cancelled' } : app
          )
        );
        setIsModalOpen(false);
        toast.success('Appointment cancelled successfully');
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      toast.error('Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('All');
    setFilterDate('');
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Confirmed: 'bg-green-100 text-green-800',
    Completed: 'bg-blue-100 text-blue-800',
    Cancelled: 'bg-red-100 text-red-800',
    Rescheduled: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">All Appointments</h1>
          <button
          onClick={resetFilters}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
          Reset Filters
          </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
            <input
              type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient, doctor, or clinic..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
            >
              <option value="All">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
              <option value="Rescheduled">Rescheduled</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <FaCalendarAlt className="text-gray-400" />
          <input
            type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
            />
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.doctorName}</div>
                      <div className="text-xs text-gray-500">{appointment.specialization}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(appointment.appointmentDate)}</div>
                      <div className="text-xs text-gray-500">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[appointment.status] || 'bg-gray-100 text-gray-800'}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <FaEye className="inline mr-1" /> View
                      </button>
                      {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTimes className="inline mr-1" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No appointments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {isModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Appointment Details</h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center mb-2">
                  <FaUserInjured className="text-blue-500 mr-2" />
                  <span className="font-semibold">Patient:</span>
                </div>
                <p className="text-gray-700 ml-6">{selectedAppointment.patientName}</p>
                {selectedAppointment.patientEmail && (
                  <p className="text-gray-500 text-sm ml-6">{selectedAppointment.patientEmail}</p>
                )}
                {selectedAppointment.patientPhone && (
                  <p className="text-gray-500 text-sm ml-6">{selectedAppointment.patientPhone}</p>
                )}
      </div>

              <div>
                <div className="flex items-center mb-2">
                  <FaUserMd className="text-blue-500 mr-2" />
                  <span className="font-semibold">Doctor:</span>
                </div>
                <p className="text-gray-700 ml-6">{selectedAppointment.doctorName}</p>
                <p className="text-gray-500 text-sm ml-6">{selectedAppointment.specialization}</p>
                  </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <FaCalendarAlt className="text-blue-500 mr-2" />
                  <span className="font-semibold">Date & Time:</span>
                  </div>
                <p className="text-gray-700 ml-6">{formatDate(selectedAppointment.appointmentDate)}</p>
                <p className="text-gray-500 text-sm ml-6">
                  {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                </p>
                  </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <span className="font-semibold">Status:</span>
                </div>
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ml-6 ${statusColors[selectedAppointment.status] || 'bg-gray-100 text-gray-800'}`}>
                  {selectedAppointment.status}
                </span>
              </div>
                  </div>
            
            {selectedAppointment.notes && (
              <div className="mb-4">
                <span className="font-semibold">Notes:</span>
                <p className="text-gray-700 mt-1">{selectedAppointment.notes}</p>
          </div>
        )}
            
            <div className="flex justify-end mt-6 gap-2">
              {selectedAppointment.status !== 'Cancelled' && selectedAppointment.status !== 'Completed' && (
            <button
                  onClick={() => handleCancelAppointment(selectedAppointment.id)}
                  disabled={cancelLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
              )}
            <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
                Close
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllAppointments;