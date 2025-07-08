import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { FiFilter, FiSearch, FiMapPin, FiClock, FiStar, FiArrowRight, FiCheckCircle, FiSliders, FiX, FiUser, FiBriefcase, FiAward } from "react-icons/fi";
import { HiOutlineAdjustments } from "react-icons/hi";
import { doctorService, specializationService } from "../services/api";
import ProfilePicture from '../components/ProfilePicture';

const Doctors = () => {
  const { backendUrl } = useContext(AppContext);
  const { speciality } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get specialty from URL query params as fallback to path params
  const specialtyFromQuery = searchParams.get('specialty');

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [sortOption, setSortOption] = useState("relevance");
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [error, setError] = useState(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching doctors...');
      const response = await doctorService.getAllDoctors();
      console.log('Doctors response:', response);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Map the response data array to ensure all required fields are present
      const processedDoctors = response.data.data.map(doctor => ({
        id: doctor.id,
        firstName: doctor.firstName || '',
        lastName: doctor.lastName || '',
        specializationID: doctor.specializationID,
        clinicID: doctor.clinicID,
        address: doctor.address || '',
        phoneNumber: doctor.phoneNumber || '',
        profilePicture: doctor.profilePicture || '',
        description: doctor.description || '',
        qualification: doctor.qualification || '',
        clinicName: doctor.clinicName || '',
        specializationName: doctor.specializationName || 'General',
        experience: doctor.experience || '',
        currentFee: doctor.currentFee || '',
        email: doctor.email || ''
      }));
      
      console.log('Processed doctors:', processedDoctors);
      setDoctors(processedDoctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setError(error.response?.data?.message || error.message || "Failed to load doctors. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSpecializations = useCallback(async () => {
    try {
      const response = await specializationService.getAllSpecializations();
      if (response.data) {
        setSpecializations(Array.isArray(response.data) ? response.data : []);
      } else {
        setSpecializations([]);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
      setSpecializations([]);
    }
  }, []);

  const getSpecialityName = useCallback((specializationID) => {
    const spec = specializations.find(s => s.id === specializationID);
    return spec ? spec.name : "General";
  }, [specializations]);

  const sortDoctors = (doctors) => {
    switch (sortOption) {
      case "rating":
        return [...doctors].sort((a, b) => (b.rating || 4) - (a.rating || 4));
      case "name":
        return [...doctors].sort((a, b) => 
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );
      case "availability":
        return [...doctors].sort((a, b) => 
          a.nextAvailable?.localeCompare(b.nextAvailable || "")
        );
      default: // relevance or any other case
        return doctors;
    }
  };

  const applyFilter = useCallback(() => {
    if (!doctors.length) return;
    
    let filtered = [...doctors];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.firstName?.toLowerCase().includes(query) || 
        doc.lastName?.toLowerCase().includes(query) ||
        getSpecialityName(doc.specializationID).toLowerCase().includes(query)
      );
    }

    // Filter by selected speciality from URL path
    if (speciality) {
      filtered = filtered.filter(doc => getSpecialityName(doc.specializationID) === speciality);
    }
    
    // Filter by selected speciality from URL query param
    else if (specialtyFromQuery) {
      const specName = specialtyFromQuery.toLowerCase();
      filtered = filtered.filter(doc => {
        const doctorSpecName = getSpecialityName(doc.specializationID).toLowerCase();
        return doctorSpecName.includes(specName) || specName.includes(doctorSpecName);
      });
    }

    // Filter by selected speciality from dropdown
    else if (selectedSpec) {
      filtered = filtered.filter(doc => doc.specializationID === parseInt(selectedSpec, 10));
    }

    // Apply sorting
    filtered = sortDoctors(filtered);

    setFilteredDoctors(filtered);
  }, [doctors, speciality, selectedSpec, getSpecialityName, searchQuery, sortOption, specialtyFromQuery]);

  useEffect(() => {
    fetchDoctors();
    fetchSpecializations();
  }, [fetchDoctors, fetchSpecializations]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  // Save filter state for back navigation
  useEffect(() => {
    const savedState = localStorage.getItem('doctorFiltersState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const now = new Date();
        const lastView = new Date(state.lastViewTime);
        // Only restore state if it's less than 30 minutes old
        if ((now - lastView) < 30 * 60 * 1000) {
          setSearchQuery(state.searchQuery || "");
          setSortOption(state.sortOption || "relevance");
          if (state.selectedSpec) {
            setSelectedSpec(state.selectedSpec);
          }
        } else {
          localStorage.removeItem('doctorFiltersState');
        }
      } catch (e) {
        localStorage.removeItem('doctorFiltersState');
      }
    }
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const slideIn = {
    hidden: { x: "100%" },
    visible: { 
      x: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      x: "100%",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    }
  };

  const handleDoctorSelect = (doctorId) => {
    try {
      const filterState = {
        searchQuery,
        selectedSpec,
        sortOption,
        lastViewTime: new Date().toISOString()
      };
      localStorage.setItem('doctorFiltersState', JSON.stringify(filterState));
    } catch (err) {
      console.error('Failed to save filter state:', err);
    }
    
    navigate(`/appointment/book/${doctorId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-5xl mb-4">
            Find Your <span className="text-blue-600 relative">
              Perfect <motion.span 
                className="absolute -bottom-1 left-0 w-full h-1 bg-blue-600 opacity-30 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 0.8 }}
              ></motion.span>
            </span> Doctor
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-xl text-slate-600 leading-relaxed">
            Browse through our network of trusted healthcare professionals specializing in various fields
          </p>
          
          <motion.div 
            className="mt-8 max-w-2xl mx-auto relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="relative flex items-center">
              <FiSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search by name, specialty or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-16 py-4 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-base bg-white transition-all duration-200 hover:shadow-md"
              />
              {searchQuery && (
                <motion.button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiX className="text-lg" />
                </motion.button>
              )}
            </div>

            <div className="hidden md:flex justify-center mt-5 flex-wrap gap-2">
              <SortButton 
                label="Relevance" 
                active={sortOption === "relevance"}
                onClick={() => setSortOption("relevance")}
              />
              <SortButton 
                label="Rating" 
                active={sortOption === "rating"}
                onClick={() => setSortOption("rating")}
              />
              <SortButton 
                label="Name A-Z" 
                active={sortOption === "name"}
                onClick={() => setSortOption("name")}
              />
              <SortButton 
                label="Earliest Available" 
                active={sortOption === "availability"}
                onClick={() => setSortOption("availability")}
              />
            </div>
          </motion.div>
        </motion.div>

        <div className="md:hidden mb-6">
          <motion.button 
            onClick={() => setShowMobileFilter(true)}
            className="flex items-center justify-center w-full py-3 px-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HiOutlineAdjustments className="mr-2 text-blue-600" />
            <span className="font-medium text-slate-700">Filters & Sort</span>
          </motion.button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <motion.div 
            className="hidden lg:block lg:w-1/4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-md p-6 mb-4 sticky top-24 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                  <FiFilter className="mr-2 text-blue-500" /> Filters
                </h2>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-medium text-slate-800 mb-4 border-b pb-2">Sort By</h3>
                  <div className="space-y-3">
                    <SortRadioOption
                      id="sort-relevance"
                      name="sortOption"
                      value="relevance"
                      checked={sortOption === "relevance"}
                      onChange={() => setSortOption("relevance")}
                      label="Relevance" 
                    />
                    <SortRadioOption
                      id="sort-rating"
                      name="sortOption"
                      value="rating"
                      checked={sortOption === "rating"}
                      onChange={() => setSortOption("rating")}
                      label="Highest Rating" 
                    />
                    <SortRadioOption
                      id="sort-name"
                      name="sortOption"
                      value="name"
                      checked={sortOption === "name"}
                      onChange={() => setSortOption("name")}
                      label="Name (A-Z)" 
                    />
                    <SortRadioOption
                      id="sort-availability"
                      name="sortOption"
                      value="availability"
                      checked={sortOption === "availability"}
                      onChange={() => setSortOption("availability")}
                      label="Earliest Available" 
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-800 mb-4 border-b pb-2">Specialization</h3>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {specializations.map(spec => (
                      <motion.div 
                        key={spec.id}
                        whileHover={{ x: 4 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <button
                          onClick={() => speciality === spec.name ? navigate('/doctors') : navigate(`/doctors/${spec.name}`)}
                          className={`w-full text-left py-2 px-3 rounded-lg transition-all text-sm ${
                            speciality === spec.name 
                              ? 'bg-blue-50 text-blue-600 font-medium' 
                              : 'text-slate-700 hover:bg-slate-50'
                          } flex items-center justify-between`}
                        >
                          <span>{spec.name}</span>
                          {speciality === spec.name && (
                            <FiCheckCircle className="text-blue-500" size={16} />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {showMobileFilter && (
              <>
                <motion.div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileFilter(false)}
                />
                <motion.div 
                  className="fixed right-0 top-0 w-4/5 max-w-sm h-full bg-white z-50 p-5 overflow-y-auto rounded-l-2xl"
                  variants={slideIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Filters</h2>
                    <motion.button 
                      onClick={() => setShowMobileFilter(false)}
                      className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiX className="text-xl" />
                    </motion.button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-800 mb-4 border-b pb-2">Sort By</h3>
                      <div className="space-y-3">
                        <SortRadioOption
                          id="mobile-sort-relevance"
                          name="mobileSortOption"
                          value="relevance"
                          checked={sortOption === "relevance"}
                          onChange={() => setSortOption("relevance")}
                          label="Relevance" 
                        />
                        <SortRadioOption
                          id="mobile-sort-rating"
                          name="mobileSortOption"
                          value="rating"
                          checked={sortOption === "rating"}
                          onChange={() => setSortOption("rating")}
                          label="Highest Rating" 
                        />
                        <SortRadioOption
                          id="mobile-sort-name"
                          name="mobileSortOption"
                          value="name"
                          checked={sortOption === "name"}
                          onChange={() => setSortOption("name")}
                          label="Name (A-Z)" 
                        />
                        <SortRadioOption
                          id="mobile-sort-availability"
                          name="mobileSortOption"
                          value="availability"
                          checked={sortOption === "availability"}
                          onChange={() => setSortOption("availability")}
                          label="Earliest Available" 
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-800 mb-4 border-b pb-2">Specialization</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {specializations.map(spec => (
                          <motion.div 
                            key={spec.id}
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <button
                              onClick={() => {
                                setShowMobileFilter(false);
                                speciality === spec.name ? navigate('/doctors') : navigate(`/doctors/${spec.name}`);
                              }}
                              className={`w-full text-left py-3 px-4 rounded-lg transition-all text-sm ${
                                speciality === spec.name 
                                  ? 'bg-blue-50 text-blue-600 font-medium' 
                                  : 'text-slate-700 hover:bg-slate-100'
                              } flex items-center justify-between`}
                            >
                              <span>{spec.name}</span>
                              {speciality === spec.name && (
                                <FiCheckCircle className="text-blue-500" size={16} />
                              )}
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                      <motion.button
                        onClick={() => setShowMobileFilter(false)}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Apply Filters
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="lg:w-3/4">
            {loading ? (
              <motion.div 
                className="flex flex-col items-center justify-center h-64"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-16 h-16 border-4 border-t-blue-600 border-b-blue-600 border-l-blue-100 border-r-blue-100 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 text-lg">Loading doctors...</p>
              </motion.div>
            ) : error ? (
              <motion.div 
                className="bg-red-50 border-l-4 border-red-500 p-8 rounded-lg shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="bg-red-100 p-3 rounded-full mb-4 md:mb-0 md:mr-6 flex-shrink-0">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-800 mb-2">Error loading doctors</h3>
                    <p className="text-red-700 mb-6">{error}</p>
                    <motion.button
                      onClick={fetchDoctors}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Retry
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : filteredDoctors.length > 0 ? (
              <>
                <div className="mb-6 flex justify-between items-center">
                  <p className="text-slate-600">
                    Found <span className="font-semibold text-blue-600">{filteredDoctors.length}</span> doctors
                    {speciality && <span> in <span className="font-semibold text-blue-600">{speciality}</span></span>}
                  </p>
                  
                  <div className="md:hidden">
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="py-2 px-4 border border-slate-300 rounded-lg text-sm bg-white shadow-sm"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="rating">Rating</option>
                      <option value="name">Name</option>
                      <option value="availability">Availability</option>
                    </select>
                  </div>
                </div>
              
                <motion.div 
                  className="grid grid-cols-1 gap-6"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  {filteredDoctors.map(doctor => (
                    <motion.div
                      key={doctor.id}
                      variants={item}
                      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)" }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg cursor-pointer group border border-slate-100"
                      onClick={() => handleDoctorSelect(doctor.id)}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="relative h-56 md:h-auto md:w-1/3">
                          <div className="w-full h-full bg-gradient-to-tr from-blue-50 to-indigo-50">
                            <ProfilePicture 
                              imageUrl={doctor.profilePicture}
                              type="doctor"
                              doctorId={doctor.id}
                              className="w-full h-full object-cover"
                              name={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                            />
                          </div>
                          <div className="absolute top-4 left-4">
                            <motion.div 
                              className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-medium shadow-sm flex items-center"
                              whileHover={{ y: -2 }}
                            >
                              <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></div>
                              <span>Available</span>
                            </motion.div>
                          </div>
                        </div>

                        <div className="p-6 flex-1 md:border-l border-slate-50">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center mb-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mr-2">
                                  {getSpecialityName(doctor.specializationID)}
                                </span>
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <FiStar 
                                      key={star} 
                                      className={`${star <= (doctor.rating || 4) ? "text-yellow-400 fill-current" : "text-slate-300"}`} 
                                      size={14} 
                                    />
                                  ))}
                                  <span className="text-slate-500 text-xs ml-1">{doctor.rating || 4.0}</span>
                                </div>
                              </div>
                            
                              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                Dr. {doctor.firstName} {doctor.lastName}
                              </h3>
                              
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center text-sm text-slate-600">
                                  <FiMapPin className="mr-2 flex-shrink-0 text-slate-400" />
                                  <span className="truncate">{doctor.address || "Medical Center"}</span>
                                </div>
                                
                                <div className="flex items-center text-sm text-slate-600">
                                  <FiClock size={14} className="mr-2 text-slate-400" />
                                  <span>Next available: {doctor.nextAvailable || "Today"}</span>
                                </div>
                              </div>
                              
                              <div className="mt-5">
                                <p className="text-sm text-slate-500 line-clamp-2">
                                  {doctor.description || `Dr. ${doctor.firstName} ${doctor.lastName} is a professional ${getSpecialityName(doctor.specializationID)} with experience in treating various conditions.`}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-6">
                            <div className="text-blue-600 font-semibold">
                              ${doctor.currentFee || 100}
                            </div>
                            <motion.button 
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center font-medium transition-colors text-sm shadow-sm"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Book Appointment <FiArrowRight className="ml-2" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </>
            ) : (
              <motion.div 
                className="bg-white rounded-xl p-12 text-center shadow-md border border-slate-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center rounded-full bg-blue-50">
                  <FiSearch className="w-12 h-12 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-800 mb-3">No Doctors Found</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  {searchQuery 
                    ? `No doctors match "${searchQuery}". Try a different search term or browse by specialty.` 
                    : speciality 
                      ? `No doctors found with specialization in ${speciality}.` 
                      : "No doctors available at the moment."}
                </p>
                <motion.button
                  onClick={() => {
                    setSearchQuery('');
                    if (speciality) navigate('/doctors');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear Filters
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Doctor Specialties Overview - New Section */}
        {!loading && filteredDoctors.length > 0 && !speciality && (
          <motion.div
            className="mt-16 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Popular Specializations
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {specializations.slice(0, 4).map(spec => (
                <motion.div
                  key={spec.id}
                  className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all"
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    {spec.name === "Cardiology" && <FiAward className="text-blue-600 text-xl" />}
                    {spec.name === "Pediatrics" && <FiUser className="text-blue-600 text-xl" />}
                    {spec.name === "Orthopedics" && <FiBriefcase className="text-blue-600 text-xl" />}
                    {!["Cardiology", "Pediatrics", "Orthopedics"].includes(spec.name) && 
                      <FiAward className="text-blue-600 text-xl" />
                    }
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{spec.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {spec.description || `Specialized care for various ${spec.name.toLowerCase()} conditions and treatments.`}
                  </p>
                  
                  <motion.button
                    onClick={() => navigate(`/doctors/${spec.name}`)}
                    className="text-blue-600 font-medium text-sm flex items-center hover:text-blue-700"
                    whileHover={{ x: 5 }}
                  >
                    Browse Doctors <FiArrowRight className="ml-2" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const SortButton = ({ label, active, onClick }) => (
  <motion.button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm transition-all ${
      active 
        ? 'bg-blue-100 text-blue-700 font-medium shadow-sm' 
        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
    }`}
    whileHover={{ y: -2 }}
    whileTap={{ y: 0 }}
  >
    {label}
  </motion.button>
);

const SortRadioOption = ({ id, name, value, checked, onChange, label }) => (
  <div className="flex items-center">
    <input
      id={id}
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
    />
    <label htmlFor={id} className="ml-3 text-sm text-slate-700">
      {label}
    </label>
  </div>
);

export default Doctors;
