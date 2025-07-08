import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfilePicture from '../../components/ProfilePicture';
import { FiSearch, FiMessageSquare, FiUser, FiFilter, FiX, FiCheck, FiPhone, FiMail, FiMapPin, FiClock, FiAlertCircle, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { doctorService } from '../../services/api';

const PatientContacts = () => {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [currentLetter, setCurrentLetter] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use the doctorService from api.js
        const response = await doctorService.getAllDoctors();
        
        if (response.data && response.data.data) {
          // Extract the doctors array from the response
          const doctorsData = response.data.data;
          
          // Sort doctors alphabetically by last name
          const sortedDoctors = doctorsData.sort((a, b) => 
            a.lastName.localeCompare(b.lastName)
          );
          setDoctors(sortedDoctors);
          
          // Extract unique specialties
          const uniqueSpecialties = [...new Set(doctorsData
            .filter(doc => doc.specializationName)
            .map(doc => doc.specializationName))]
            .sort();
          setSpecialties(uniqueSpecialties);
        } else {
          // Handle empty or unexpected response
          setDoctors([]);
          setSpecialties([]);
          setError("No doctors found. Please try again later.");
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
        setSpecialties([]);
        setError("Failed to load doctors. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Filter doctors based on search input, letter filter, and specialty
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = filter === '' || 
      `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      (doctor.specializationName && doctor.specializationName.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesLetter = currentLetter === '' || 
      doctor.lastName.charAt(0).toUpperCase() === currentLetter;
    
    const matchesSpecialty = selectedSpecialty === '' || 
      doctor.specializationName === selectedSpecialty;
    
    return matchesSearch && matchesLetter && matchesSpecialty;
  });

  // Get unique first letters for the alphabet filter
  const alphabet = [...new Set(doctors.map(doctor => doctor.lastName.charAt(0).toUpperCase()))]
    .sort()
    .filter(letter => letter.match(/[A-Z]/)); // Only include letters A-Z

  const handleChatClick = (doctorId) => {
    try {
      // Store the doctor ID in localStorage for easy access in the chat page
      localStorage.setItem('currentChatDoctorId', doctorId);
      
      // Navigate to the patient-specific chat page with the doctor as the recipient
      navigate(`/patient/chat/${doctorId}`);
    } catch (error) {
      console.error('Error navigating to chat:', error);
      toast.error('Could not start chat. Please try again.');
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'N/A';
    
    // Basic formatting to ensure it looks like a phone number
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 11)}`;
    }
    return phoneNumber;
  };
  
  // Format fee for display
  const formatFee = (fee) => {
    if (fee == null) return 'Fee not specified';
    
    try {
      // Handle different fee formats
      if (typeof fee === 'number') {
        // Check if the fee is reasonable (less than 100,000)
        if (fee >= 0 && fee < 100000) {
          return `$${fee.toFixed(2)}`;
        } else {
          // If fee is unreasonably large, it might be a data error
          return `$${(fee / 100).toFixed(2)}`; // Try dividing by 100 as a fix
        }
      } else if (typeof fee === 'string') {
        // Try to parse the string as a number
        const parsedFee = parseFloat(fee);
        if (!isNaN(parsedFee)) {
          if (parsedFee >= 0 && parsedFee < 100000) {
            return `$${parsedFee.toFixed(2)}`;
          } else {
            return `$${(parsedFee / 100).toFixed(2)}`;
          }
        }
        // If it's a string but not a valid number, just return it with a $ sign
        return `$${fee}`;
      }
      
      // Fallback
      return `$${fee}`;
    } catch (error) {
      console.error('Error formatting fee:', error);
      return 'Fee not available';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800">Contact Medical Professionals</h1>
          <p className="text-slate-500 mt-1">Chat with your doctors or find new specialists</p>
        </div>
        
        {/* Search and filters */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-grow">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name or specialty..."
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentLetter(''); // Reset letter filter when searching
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                {filter && (
                  <button
                    onClick={() => setFilter('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            
            <div className="md:w-1/4">
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none shadow-sm"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Alphabet filter */}
          <div className="mt-4 flex flex-wrap gap-1">
            <button
              onClick={() => setCurrentLetter('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                currentLetter === '' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All
            </button>
            {alphabet.map(letter => (
              <button
                key={letter}
                onClick={() => setCurrentLetter(letter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  currentLetter === letter 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
        
        {/* Doctors list */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 border-r-2 border-b-2 border-slate-100"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <div className="bg-red-50 rounded-full p-5 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <FiAlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Error Loading Doctors</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 inline-flex items-center text-sm font-medium shadow-sm"
              >
                <FiRefreshCw className="mr-2" /> Retry
              </button>
            </div>
          ) : filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map(doctor => (
                <div 
                  key={doctor.id} 
                  className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300"
                >
                  <div className="p-5">
                    {/* Doctor header with name and specialty */}
                    <div className="flex items-center mb-5">
                      <ProfilePicture
                        imageUrl={doctor.profilePicture}
                        type="doctor"
                        className="w-16 h-16 rounded-full border-2 border-slate-100 shadow-sm"
                        name={`${doctor.firstName} ${doctor.lastName}`}
                        doctorId={doctor.id}
                      />
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-slate-800">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h3>
                        <div className="text-blue-600 text-sm">
                          {doctor.specializationName || 'General Practice'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact information */}
                    <div className="space-y-2 mb-5">
                      {/* Phone number */}
                      <div className="flex items-center text-slate-600">
                        <FiPhone className="mr-3 text-slate-400 flex-shrink-0" />
                        <span>{doctor.phoneNumber ? formatPhoneNumber(doctor.phoneNumber) : '(010) 022-0029'}</span>
                      </div>
                      
                      {/* Email */}
                      <div className="flex items-center text-slate-600">
                        <FiMail className="mr-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{doctor.email || `d${doctor.id}@gmail.com`}</span>
                      </div>
                      
                      {/* Address */}
                      <div className="flex items-center text-slate-600">
                        <FiMapPin className="mr-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{doctor.address || 'Ismailia, Egypt'}</span>
                      </div>
                      
                      {/* Experience */}
                      <div className="flex items-center text-slate-600">
                        <FiClock className="mr-3 text-slate-400 flex-shrink-0" />
                        <span>{doctor.experience ? `${doctor.experience} years experience` : '5 years experience'}</span>
                      </div>
                    </div>
                    
                    {/* Availability and fee */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                        <span className="text-slate-600">Available</span>
                      </div>
                      
                      <div className="text-blue-600 font-medium">
                        {doctor.currentFee != null ? formatFee(doctor.currentFee) : '$100.00'}
                      </div>
                    </div>
                    
                    {/* Start conversation button */}
                    <button
                      onClick={() => handleChatClick(doctor.id)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 flex items-center justify-center text-sm font-medium"
                    >
                      <FiMessageSquare className="mr-2" /> Start Conversation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="bg-slate-50 rounded-full p-5 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <FiSearch className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No doctors found</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {filter 
                  ? `No doctors match "${filter}". Try a different search term or browse by specialty.` 
                  : currentLetter 
                    ? `No doctors with last name starting with "${currentLetter}".` 
                    : "Try adjusting your filters to find more results."}
              </p>
              <button
                onClick={() => {
                  setFilter('');
                  setCurrentLetter('');
                  setSelectedSpecialty('');
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 inline-flex items-center text-sm font-medium shadow-sm"
              >
                <FiX className="mr-2" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientContacts; 