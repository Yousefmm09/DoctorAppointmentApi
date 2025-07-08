import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiFilter, FiSearch, FiMapPin, FiSliders, FiX, FiDollarSign, FiClock, FiCalendar, FiInfo, FiLogIn, FiUserPlus } from 'react-icons/fi';
import { AppContext } from '../context/AppContext';
import DoctorCard from '../components/DoctorCard';
import tabebakLogo from "../assets/tabebak_logo.svg";
import axios from 'axios';
import { toast } from 'react-toastify';

const AllDoctors = () => {
  const { token } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // States
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState(queryParams.get('q') || '');
  const [selectedSpecialty, setSelectedSpecialty] = useState(queryParams.get('specialty') || '');
  const [selectedLocation, setSelectedLocation] = useState(queryParams.get('location') || '');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  
  // All Egyptian governorates
  const governorates = [
    // Cairo region
    { name: 'Cairo', cities: ['Cairo', 'Maadi', 'Heliopolis', 'Nasr City', 'New Cairo', 'October', '6th of October', 'Sheikh Zayed'] },
    { name: 'Giza', cities: ['Giza', 'Dokki', 'Mohandessin', 'Haram', 'Faisal'] },
    { name: 'Qalyubia', cities: ['Banha', 'Shubra El-Kheima', 'Al Khanka', 'Qalyub', 'Obour City'] },
    
    // Lower Egypt (Delta)
    { name: 'Alexandria', cities: ['Alexandria', 'Miami', 'Montaza', 'Agami'] },
    { name: 'Beheira', cities: ['Damanhur', 'Kafr El Dawwar', 'Rosetta', 'Edko', 'Kom Hamada'] },
    { name: 'Kafr El Sheikh', cities: ['Kafr El Sheikh', 'Baltim', 'Desouk', 'Metobas'] },
    { name: 'Dakahlia', cities: ['Mansoura', 'Mit Ghamr', 'Talkha', 'Aga'] },
    { name: 'Damietta', cities: ['Damietta', 'New Damietta', 'Ras El Bar', 'Faraskur'] },
    { name: 'Gharbia', cities: ['Tanta', 'El-Mahalla El-Kubra', 'Kafr El Zayat', 'Samanoud'] },
    { name: 'Monufia', cities: ['Shibin El Kom', 'Ashmoun', 'Menouf', 'Sers El-Lyan'] },
    { name: 'Sharqia', cities: ['Zagazig', 'Bilbeis', '10th of Ramadan', 'Minya Al Qamh'] },
    
    // Canal region
    { name: 'Port Said', cities: ['Port Said', 'Port Fouad'] },
    { name: 'Ismailia', cities: ['Ismailia', 'Fayed', 'El Qantara'] },
    { name: 'Suez', cities: ['Suez', 'Ain Sokhna'] },
    
    // Upper Egypt
    { name: 'Faiyum', cities: ['Faiyum', 'Sinnuris', 'Tamiya'] },
    { name: 'Beni Suef', cities: ['Beni Suef', 'El Wasta', 'Nasser', 'Ihnasia'] },
    { name: 'Minya', cities: ['Minya', 'Mallawi', 'Samalut', 'Abu Qurqas'] },
    { name: 'Asyut', cities: ['Asyut', 'Dairut', 'Manfalut', 'Qusiya'] },
    { name: 'Sohag', cities: ['Sohag', 'Akhmim', 'Tahta', 'Girga'] },
    { name: 'Qena', cities: ['Qena', 'Nag Hammadi', 'Luxor', 'Esna'] },
    { name: 'Luxor', cities: ['Luxor', 'Karnak', 'Valley of the Kings'] },
    { name: 'Aswan', cities: ['Aswan', 'Kom Ombo', 'Edfu', 'Philae'] },
    
    // Desert governorates
    { name: 'Matruh', cities: ['Marsa Matruh', 'El Alamein', 'Siwa'] },
    { name: 'New Valley', cities: ['Kharga', 'Dakhla', 'Farafra', 'Baris'] },
    { name: 'Red Sea', cities: ['Hurghada', 'Safaga', 'Marsa Alam', 'El Quseir'] },
    { name: 'North Sinai', cities: ['Arish', 'Bir al-Abed', 'Sheikh Zuweid'] },
    { name: 'South Sinai', cities: ['Sharm El Sheikh', 'Dahab', 'Nuweiba', 'Saint Catherine'] }
  ];
  
  // Flatten the locations for search
  const locations = governorates.reduce((acc, gov) => {
    acc.push(gov.name);
    acc.push(...gov.cities);
    return acc;
  }, []);
  
  // Generate random rating data
  const generateRandomRating = (doctorId) => {
    // Use doctorId to ensure consistent ratings between renders
    const seed = doctorId * 13 % 100;
    const baseRating = 4.3 + (seed % 7) / 10; // Rating between 4.3 and 5.0
    return {
      value: parseFloat(baseRating.toFixed(1)),
      count: 70 + Math.floor(seed % 80) // Count between 70 and 150
    };
  };
  
  // Fetch doctors data from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
        
        // Fetch doctors
        const doctorsResponse = await axios.get(`${baseUrl}/api/Doctor`);
        console.log('Doctors API response:', doctorsResponse);
        
        // Fetch specializations
        const specializationsResponse = await axios.get(`${baseUrl}/api/Specializations/AllSpecializations`);
        console.log('Specializations API response:', specializationsResponse);
        
        // Process doctors data
        if (doctorsResponse.data && (doctorsResponse.data.data || Array.isArray(doctorsResponse.data))) {
          const doctorsData = Array.isArray(doctorsResponse.data) 
            ? doctorsResponse.data 
            : (doctorsResponse.data.data || []);
          
          // Process each doctor to ensure they have all required fields
          const processedDoctors = doctorsData.map(doctor => {
            // Use random ratings instead of calling the missing API endpoint
            const randomRating = generateRandomRating(doctor.id);
            
            // Use the actual profile picture if available
            let imageUrl = doctor.profilePicture;
            
            // If no image or invalid image, use UI avatar as fallback
            if (!imageUrl || imageUrl === "null" || imageUrl === "") {
              const fullName = `${doctor.firstName || ''} ${doctor.lastName || ''}`;
              imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}&background=0D8ABC&color=fff&size=256`;
            } else if (!imageUrl.startsWith('http')) {
              // If it's a relative path, make it absolute
              imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }
            
            // Generate formatted object
            return {
              id: doctor.id,
              name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
              firstName: doctor.firstName || '',
              lastName: doctor.lastName || '',
              specialization: doctor.specializationName || 'General',
              specializationId: doctor.specializationID,
              rating: randomRating.value,
              ratingCount: randomRating.count,
              imageUrl: imageUrl,
              availableToday: Math.random() < 0.3, // Random availability
              location: doctor.address || 'Cairo, Egypt',
              fee: doctor.currentFee || Math.floor(Math.random() * (500 - 200) + 200),
              experience: doctor.experience || '5+ years',
              description: doctor.description || `Experienced ${doctor.specializationName || 'medical'} specialist.`,
              education: doctor.qualification || 'MD',
              nextAvailable: '2 days' // Mock data
            };
          });
          
          // Set doctors state with processed data
          setDoctors(processedDoctors.filter(doc => doc !== null));
        } else {
          console.error('Invalid doctor data format from API:', doctorsResponse.data);
          setError('Could not fetch doctors. Invalid data format.');
          
          // Fallback to empty array
          setDoctors([]);
        }
        
        // Process specializations data
        if (specializationsResponse.data) {
          const data = Array.isArray(specializationsResponse.data) 
            ? specializationsResponse.data 
            : (specializationsResponse.data.data || []);
          
          setSpecializations(data);
        } else {
          console.error('Invalid specialization data format from API:', specializationsResponse.data);
          setSpecializations([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Could not fetch data from server. Please try again later.');
        toast.error('Error loading data. Using fallback data.');
        
        // Fallback to empty arrays
        setDoctors([]);
        setSpecializations([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter doctors based on search criteria
  useEffect(() => {
    if (!doctors.length) return;
    
    let filtered = [...doctors];
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doctor => 
        doctor.name.toLowerCase().includes(term) || 
        doctor.specialization.toLowerCase().includes(term)
      );
    }
    
    // Apply specialty filter
    if (selectedSpecialty) {
      filtered = filtered.filter(doctor => 
        doctor.specialization.toLowerCase() === selectedSpecialty.toLowerCase()
      );
    }
    
    // Apply location filter
    if (selectedLocation) {
      filtered = filtered.filter(doctor => 
        doctor.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }
    
    // Apply price range filter
    filtered = filtered.filter(doctor => 
      doctor.fee >= priceRange[0] && doctor.fee <= priceRange[1]
    );
    
    // Apply sorting
    if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price_low') {
      filtered.sort((a, b) => a.fee - b.fee);
    } else if (sortBy === 'price_high') {
      filtered.sort((a, b) => b.fee - a.fee);
    } else if (sortBy === 'availability') {
      filtered.sort((a, b) => {
        if (a.availableToday && !b.availableToday) return -1;
        if (!a.availableToday && b.availableToday) return 1;
        return 0;
      });
    }
    
    setFilteredDoctors(filtered);
  }, [doctors, searchTerm, selectedSpecialty, selectedLocation, priceRange, sortBy]);
  
  const handleBookNow = (doctor) => {
    if (token) {
      navigate(`/appointment/book/${doctor.id}`);
    } else {
      setSelectedDoctor(doctor);
      setShowLoginModal(true);
    }
  };
  
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Section with Search */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4 text-center">Find Your Perfect Doctor</h1>
          <p className="text-lg mb-8 text-center max-w-2xl mx-auto">
            Browse through our network of trusted healthcare professionals specializing in various fields
          </p>
          
          <div className="max-w-3xl mx-auto relative">
            <div className="flex items-center bg-white rounded-full shadow-lg overflow-hidden">
              <div className="px-4">
                <FiSearch className="text-gray-400 text-xl" />
          </div>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, specialty or condition..." 
                className="flex-1 py-4 px-2 outline-none text-gray-700" 
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {specializations.slice(0, 6).map(spec => (
              <button 
                key={spec.id || spec.name}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedSpecialty === spec.name ? 
                  'bg-white text-blue-600' : 
                  'bg-blue-600/20 text-white hover:bg-blue-600/30'
                }`}
                onClick={() => setSelectedSpecialty(selectedSpecialty === spec.name ? '' : spec.name)}
              >
                {spec.name || spec}
              </button>
            ))}
            
            <button
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-blue-600/20 text-white hover:bg-blue-600/30"
              onClick={() => setShowFilters(true)}
            >
              <FiSliders className="inline mr-1" /> More filters
            </button>
          </div>
              </div>
            </div>
            
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Main Layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden md:block w-full md:w-1/4 lg:w-1/5">
            <div className="sticky top-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="font-bold text-lg mb-4 text-gray-800">Filters</h2>
              
              {/* Location Filter */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Location</h3>
              <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All locations</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>
            
              {/* Specialty Filter */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Specialty</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center">
                <input
                      type="radio" 
                      id="spec-all" 
                      name="specialty"
                      checked={selectedSpecialty === ''}
                      onChange={() => setSelectedSpecialty('')}
                      className="w-4 h-4 text-blue-600" 
                    />
                    <label htmlFor="spec-all" className="ml-2 text-gray-700">All Specialties</label>
                  </div>
                  
                  {specializations.map((spec) => (
                    <div key={spec.id || spec.name} className="flex items-center">
                <input
                        type="radio" 
                        id={`spec-${spec.id || spec.name}`}
                        name="specialty"
                        checked={selectedSpecialty === (spec.name || spec)}
                        onChange={() => setSelectedSpecialty(spec.name || spec)}
                        className="w-4 h-4 text-blue-600" 
                      />
                      <label htmlFor={`spec-${spec.id || spec.name}`} className="ml-2 text-gray-700">{spec.name || spec}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Price Range Filter */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Price Range (EGP)</h3>
                <div className="px-2">
                <input
                  type="range"
                  min="0"
                  max="2000"
                    step="100"
                  value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-gray-600">0</span>
                    <span className="text-sm font-medium text-blue-600">{priceRange[1]} EGP</span>
                  </div>
              </div>
            </div>
            
            {/* Sort By */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Sort By</h3>
              <div className="space-y-2">
                  {[
                    { id: 'rating', label: 'Highest Rating' },
                    { id: 'price_low', label: 'Price: Low to High' },
                    { id: 'price_high', label: 'Price: High to Low' },
                    { id: 'availability', label: 'Availability' }
                  ].map((option) => (
                    <div key={option.id} className="flex items-center">
                  <input
                    type="radio"
                        id={`sort-${option.id}`}
                    name="sortBy"
                        checked={sortBy === option.id}
                        onChange={() => setSortBy(option.id)}
                        className="w-4 h-4 text-blue-600" 
                      />
                      <label htmlFor={`sort-${option.id}`} className="ml-2 text-gray-700">{option.label}</label>
                    </div>
                  ))}
                </div>
            </div>
            
            {/* Reset Filters */}
            <button 
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialty('');
                setSelectedLocation('');
                setPriceRange([0, 2000]);
                setSortBy('rating');
              }}
            >
              Reset Filters
            </button>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Find Your Doctor</h1>
              <button 
                className="md:hidden flex items-center gap-2 bg-white text-gray-700 py-2 px-4 rounded-lg shadow-sm"
                onClick={() => setShowFilters(true)}
              >
                <FiFilter />
                <span>Filters</span>
              </button>
            </div>
            
            {/* Results Count */}
            <p className="mb-6 text-gray-600">
              Showing {filteredDoctors.length} doctors
              {selectedSpecialty ? ` in ${selectedSpecialty}` : ''}
              {selectedLocation ? ` from ${selectedLocation}` : ''}
            </p>
            
            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 p-4 md:flex animate-pulse">
                    <div className="w-full md:w-1/4 h-48 md:h-auto bg-gray-200 rounded-lg"></div>
                    <div className="w-full md:w-3/4 p-4">
                      <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-4 w-1/4"></div>
                      <div className="flex space-x-1 mb-4">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <div key={j} className="h-4 w-4 bg-gray-200 rounded-full"></div>
                        ))}
                      </div>
                      <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                      <div className="h-10 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                    <p>{error}</p>
                  </div>
                )}
                
                {filteredDoctors.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">😕</div>
                    <h3 className="text-xl font-semibold mb-2">No doctors found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                    <button 
                      className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedSpecialty('');
                        setSelectedLocation('');
                        setPriceRange([0, 2000]);
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {filteredDoctors.map((doctor, index) => (
                      <motion.div 
                        key={doctor.id}
                        variants={item}
                        className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                      >
                        <div className="relative pb-[60%]">
                          <img 
                            src={doctor.imageUrl}
                            alt={doctor.name}
                            className="absolute w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.firstName || '')}+${encodeURIComponent(doctor.lastName || '')}&background=0D8ABC&color=fff&size=256`;
                            }}
                          />
                          {doctor.availableToday && (
                            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                              Available Today
                            </span>
                          )}
                        </div>
                        
                        {/* Doctor Info */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-lg text-gray-800">{doctor.name}</h3>
                              <span className="text-blue-600 font-bold">{doctor.fee} EGP</span>
                            </div>
                            
                            <div className="mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {doctor.specialization}
                            </span>
                            {doctor.experience && (
                                <span className="inline-flex items-center ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {doctor.experience}
                              </span>
                            )}
                          </div>
                          
                          <div className="mb-3 flex items-center">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FiStar 
                                  key={star} 
                                  className={`${star <= Math.floor(doctor.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="ml-2 text-sm">
                              <span className="font-medium">{doctor.rating}</span>
                              <span className="text-gray-500"> ({doctor.ratingCount})</span>
                            </span>
                          </div>
                          
                            <div className="grid grid-cols-1 gap-2 mb-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <FiMapPin className="mr-2 text-gray-400" />
                              <span>{doctor.location}</span>
                            </div>
                              <div className="flex items-center text-blue-600">
                                <FiCalendar className="mr-2 text-gray-400" />
                                <span>Next available: <span className="font-medium">{doctor.nextAvailable}</span></span>
                            </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => handleBookNow(doctor)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm hover:shadow"
                            >
                              Book Now
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                document.getElementById(`doctorModal-${doctor.id}`).showModal();
                              }}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-3 rounded-lg transition-colors"
                              aria-label="Doctor details"
                            >
                              <FiInfo />
                            </button>
                          </div>
                        </div>
                        
                        {/* Doctor Details Modal */}
                        <dialog id={`doctorModal-${doctor.id}`} className="modal backdrop:bg-gray-900/50 rounded-lg p-0 w-full max-w-2xl">
                          <div className="bg-white rounded-lg overflow-hidden">
                            <div className="relative h-40 bg-blue-600">
                              <button 
                                onClick={() => document.getElementById(`doctorModal-${doctor.id}`).close()}
                                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full backdrop-blur-sm"
                              >
                                <FiX className="text-white text-xl" />
                              </button>
                            </div>
                            
                            <div className="relative px-6 pb-6">
                              <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6">
                                <div className="relative">
                                  <img 
                                    src={doctor.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.firstName || '')}+${encodeURIComponent(doctor.lastName || '')}&background=0D8ABC&color=fff&size=256`}
                                    alt={doctor.name}
                                    className="w-32 h-32 rounded-full border-4 border-white object-cover"
                                    onError={(e) => {
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.firstName || '')}+${encodeURIComponent(doctor.lastName || '')}&background=0D8ABC&color=fff&size=256`;
                                    }}
                                  />
                                </div>
                                
                                <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                                  <h3 className="text-2xl font-bold text-gray-800">{doctor.name}</h3>
                                  <p className="text-blue-600">{doctor.specialization}</p>
                                  
                                  <div className="flex items-center mt-2 justify-center sm:justify-start">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <FiStar 
                                          key={star} 
                                          className={`${star <= Math.floor(doctor.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                        />
                                      ))}
                                    </div>
                                    <span className="ml-2">
                                      <span className="font-medium">{doctor.rating}</span>
                                      <span className="text-gray-500"> ({doctor.ratingCount} reviews)</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-3">About</h4>
                                  <p className="text-gray-600">{doctor.description}</p>
                                  
                                  <div className="mt-4">
                                    <h4 className="font-semibold text-gray-800 mb-2">Languages</h4>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="px-2 py-1 bg-gray-100 rounded-md text-sm">Arabic</span>
                                      <span className="px-2 py-1 bg-gray-100 rounded-md text-sm">English</span>
                                      {Math.random() > 0.5 && (
                                        <span className="px-2 py-1 bg-gray-100 rounded-md text-sm">French</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">Consultation Fee</h4>
                                    <p className="text-xl font-bold text-blue-600">{doctor.fee} EGP</p>
                                    <p className="text-sm text-gray-500">Cash and credit cards accepted</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">Education</h4>
                                    <p className="text-gray-600">{doctor.education}</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">Experience</h4>
                                    <p className="text-gray-600">{doctor.experience}</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">Location</h4>
                                    <p className="text-gray-600 flex items-center">
                                      <FiMapPin className="mr-2 text-gray-400" />
                                      {doctor.location}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Visit details will be provided after booking</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-6 border-t border-gray-200 pt-6">
                                <h4 className="font-semibold text-gray-800 mb-3">Available Services</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {[
                                    'Consultation', 
                                    'Follow-up Visit', 
                                    'Medical Reports', 
                                    'Prescriptions',
                                    'Referrals',
                                    'Medical Certificates'
                                  ].map((service, idx) => (
                                    <div key={idx} className="flex items-center">
                                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-gray-600">{service}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex gap-4 mt-6">
                                <button
                                  onClick={() => {
                                    document.getElementById(`doctorModal-${doctor.id}`).close();
                                    handleBookNow(doctor);
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                                >
                                  Book Appointment
                                </button>
                              </div>
                            </div>
                          </div>
                        </dialog>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="flex justify-end">
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setShowLoginModal(false)}
                  >
                    <FiX className="text-xl" />
                  </button>
                </div>
                <img src={tabebakLogo} alt="Tabebak Logo" className="h-16 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-1">Sign in to continue</h3>
                <p className="text-gray-600">Login to book an appointment with {selectedDoctor?.name}</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <Link 
                  to="/login" 
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  <FiLogIn />
                  <span>Login</span>
                </Link>
                
                <Link 
                  to="/register" 
                  className="flex items-center justify-center gap-2 w-full border border-blue-600 text-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <FiUserPlus />
                  <span>Create New Account</span>
                </Link>
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllDoctors; 