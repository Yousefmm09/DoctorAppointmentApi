import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaUsers, FaSearch, FaEnvelope, FaPhone, FaCommentDots, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import ProfilePicture from '../../components/ProfilePicture';
import { DoctorContext } from '../../context/DoctorContext';
import { doctorService } from '../../services/api';

const DoctorContacts = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [currentLetter, setCurrentLetter] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { token, doctorProfile } = useContext(DoctorContext);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        
        if (!token) {
          setError('Authentication required. Please log in.');
          setIsLoading(false);
          return;
        }
        
        const doctorId = doctorProfile?.id || localStorage.getItem("doctorId");
        
        if (!doctorId) {
          setError("Doctor ID not found. Please complete your profile first.");
          setIsLoading(false);
          return;
        }
        
        // Fetch appointments to extract patient information
        const response = await doctorService.getDoctorAppointments(doctorId);
        
        console.log('API Response:', response);
        if (response.data) {
          console.log('Response data type:', typeof response.data);
          console.log('Is array?', Array.isArray(response.data));
          console.log('First item:', response.data.length > 0 ? response.data[0] : 'No items');
          
          // Process appointments to extract unique patients
          const appointmentsData = Array.isArray(response.data) ? response.data : [];
          console.log('Appointments data:', appointmentsData);
          
          // Extract unique patients from appointments
          const patientMap = new Map();
          
          appointmentsData.forEach(appointment => {
            // Extract patient ID from appointment
            // The API returns PatientName but not PatientId directly
            // We need to extract it from appointment data
            const patientName = appointment.patientName || '';
            
            // Generate a unique ID for the patient based on their name
            const patientId = hashCode(patientName);
            
            if (patientName && !patientMap.has(patientId)) {
              // Split the patient name into first and last name
              const nameParts = patientName ? patientName.split(' ') : ['', ''];
              const firstName = nameParts[0] || '';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              
              patientMap.set(patientId, {
                id: patientId,
                firstName: firstName,
                lastName: lastName,
                email: appointment.patientEmail || '',
                phoneNumber: appointment.patientPhoneNumber || '',
                profilePicture: appointment.patientProfilePicture || null,
                lastAppointment: appointment.appointmentDate,
                status: appointment.status
              });
            }
          });
          
          // Convert map to array
          const patientList = Array.from(patientMap.values());
          
          // Sort patients alphabetically by last name
          const sortedPatients = patientList.sort((a, b) => 
            a.lastName.localeCompare(b.lastName)
          );
          
          setPatients(sortedPatients);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
        setError('Failed to load patients. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [token, doctorProfile]);

  // Helper function to generate a simple hash code from a string
  const hashCode = (str) => {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  };

  // Filter patients based on search input and letter filter
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = filter === '' || 
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      (patient.email && patient.email.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesLetter = currentLetter === '' || 
      patient.lastName.charAt(0).toUpperCase() === currentLetter;
    
    return matchesSearch && matchesLetter;
  });

  // Get unique first letters for the alphabet filter
  const alphabet = [...new Set(patients.map(patient => patient.lastName.charAt(0).toUpperCase()))]
    .sort()
    .filter(letter => letter.match(/[A-Z]/)); // Only include letters A-Z

  const handleChatClick = (patientId) => {
    // Navigate to the doctor-specific chat page with the patient as the recipient
    navigate(`/doctor/chat/${patientId}`);
  };

  const handleScheduleClick = (patientId) => {
    // Navigate to appointment scheduling with this patient
    navigate(`/doctor/appointments/schedule?patientId=${patientId}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Patients</h1>
            <p className="text-slate-500">
              Chat with patients who have appointments with you
            </p>
          </div>
          
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg flex items-center shadow-sm hover:bg-slate-50 text-sm font-medium"
              onClick={() => navigate('/doctor/appointments')}
            >
              <FaCalendarAlt className="mr-2 text-blue-600" /> View Appointments
            </button>
          </div>
        </div>
      </div>
        
      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-grow">
            <div className="relative">
              <input
                type="text"
                placeholder="Search patients by name or email..."
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentLetter(''); // Reset letter filter when searching
                }}
                className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute left-3 top-3 text-slate-400">
                <FaSearch />
              </span>
            </div>
          </div>
        </div>
          
        {/* Alphabet filter */}
        <div className="mt-4 flex flex-wrap gap-1">
          <button
            onClick={() => setCurrentLetter('')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md ${
              currentLetter === '' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {alphabet.map(letter => (
            <button
              key={letter}
              onClick={() => setCurrentLetter(letter)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md ${
                currentLetter === letter 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
        
      {/* Patients list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-medium text-slate-800 flex items-center">
            <FaUsers className="mr-2 text-blue-600" />
            Patient Directory
            {filteredPatients.length > 0 && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5">
                {filteredPatients.length}
              </span>
            )}
          </h2>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <FaSpinner className="animate-spin text-blue-600 mr-3 h-5 w-5" />
              <p className="text-slate-600">Loading patients...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaExclamationTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">{error}</h3>
              <p className="text-slate-600">
                Please make sure you're logged in and try again.
              </p>
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map(patient => (
                <div key={patient.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
                  <div className="p-4">
                    <div className="flex items-start space-x-4">
                      <ProfilePicture
                        imageUrl={patient.profilePicture}
                        type="patient"
                        className="w-14 h-14"
                        name={`${patient.firstName} ${patient.lastName}`}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-800 truncate">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        
                        <div className="mt-1 space-y-1">
                          {patient.email && (
                            <div className="flex items-center text-sm text-slate-600">
                              <FaEnvelope className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                              <span className="truncate">{patient.email}</span>
                            </div>
                          )}
                          
                          {patient.phoneNumber && (
                            <div className="flex items-center text-sm text-slate-600">
                              <FaPhone className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                              <span>{patient.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                        
                        {patient.lastAppointment && (
                          <div className="mt-2 text-xs text-slate-500 flex items-center">
                            <FaCalendarAlt className="w-3 h-3 text-slate-400 mr-1.5" />
                            <span>Last appointment: {new Date(patient.lastAppointment).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {patient.status && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              patient.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              patient.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              patient.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {patient.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handleChatClick(patient.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <FaCommentDots className="w-4 h-4 mr-1.5" />
                        Message
                      </button>
                      
                      <button
                        onClick={() => handleScheduleClick(patient.id)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <FaCalendarAlt className="w-4 h-4 mr-1.5" />
                        Schedule
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaUsers className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">No patients found</h3>
              <p className="text-slate-600">
                {filter ? 'No patients match your search criteria.' : 'You don\'t have any patients with appointments yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorContacts; 