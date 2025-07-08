import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { FiCalendar, FiUserPlus, FiUser, FiStar, FiArrowRight, FiHome, 
  FiFileText, FiAward, FiSearch, FiMapPin, FiClock, FiCheck, FiShield, FiTrendingUp, FiUsers, FiMessageCircle, FiInfo, FiActivity } from 'react-icons/fi';
import axios from 'axios';
import Footer from "../components/Footer";
import DoctorCard from "../components/DoctorCard";
import { getDoctorRatings, getDoctorAverageRating } from "../services/mockRatingsService";
// Try to import logo if available, otherwise use a text logo
let tabebakLogo;
try {
  tabebakLogo = require('../assets/tabebak_logo.png');
} catch (e) {
  // Logo not found, will use text fallback
}
import SpecialtyCard from '../components/SpecialtyCard';

const PublicHome = () => {
  const navigate = useNavigate();
  const { token } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [specializations, setSpecializations] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('');

  // Fetch specializations
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
        const response = await axios.get(`${baseUrl}/api/Specializations/AllSpecializations`);
        if (response.data) {
          setSpecializations(response.data);
        }
      } catch (error) {
        console.error('Error fetching specializations:', error);
        // Mock data if API fails
        setSpecializations([
          { id: 1, name: 'Cardiology', description: 'Heart specialists' },
          { id: 2, name: 'Dermatology', description: 'Skin specialists' },
          { id: 3, name: 'Neurology', description: 'Brain and nervous system' },
          { id: 4, name: 'Pediatrics', description: 'Child healthcare' },
          { id: 5, name: 'Orthopedics', description: 'Bone and joint specialists' },
          { id: 6, name: 'Dentistry', description: 'Oral healthcare' },
        ]);
      }
    };

    const fetchTopDoctors = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
        
        // First, fetch the list of doctors
        const doctorsResponse = await axios.get(`${baseUrl}/api/Doctor`);
        
        if (doctorsResponse.data && doctorsResponse.data.data) {
          // Process the doctor data
          const doctorsData = doctorsResponse.data.data.slice(0, 6);
          
          // Process each doctor without trying to access missing endpoints
          const doctorsWithRatings = doctorsData.map(doctor => {
            // Generate random rating data
            const seed = doctor.id * 13 % 100;
            const avgRating = 4.3 + (seed % 7) / 10; // Rating between 4.3 and 5.0
            const ratingCount = 70 + Math.floor(seed % 80); // Count between 70 and 150
            
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
                
                // Generate availability flag (30% chance of being available today)
                const availableToday = Math.random() < 0.3;
                
                return {
                  id: doctor.id,
                  name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
              firstName: doctor.firstName,
              lastName: doctor.lastName,
                  specialization: doctor.specializationName || 'General Practice',
              rating: parseFloat(avgRating.toFixed(1)),
                  ratingCount: ratingCount,
                  imageUrl: imageUrl,
                  availableToday: availableToday
                };
          });
          
          // Sort by rating (highest first)
          doctorsWithRatings.sort((a, b) => b.rating - a.rating);
          
          // Set state with the enhanced doctor data
          setTopDoctors(doctorsWithRatings);
        }
      } catch (error) {
        console.error('Error fetching top doctors:', error);
        // If all else fails, use hardcoded mock data with generated avatars
        const mockDoctors = [
          { 
            id: 1, 
            name: 'Dr. Sarah Johnson', 
            firstName: 'Sarah',
            lastName: 'Johnson',
            specialization: 'Cardiology', 
            rating: 4.9, 
            ratingCount: 127,
            imageUrl: `https://ui-avatars.com/api/?name=Sarah+Johnson&background=0D8ABC&color=fff&size=256`,
            availableToday: true
          },
          { 
            id: 2, 
            name: 'Dr. Michael Chen', 
            firstName: 'Michael',
            lastName: 'Chen',
            specialization: 'Neurology', 
            rating: 4.8, 
            ratingCount: 93,
            imageUrl: `https://ui-avatars.com/api/?name=Michael+Chen&background=0D8ABC&color=fff&size=256`
          },
          { 
            id: 3, 
            name: 'Dr. Emily Rodriguez', 
            firstName: 'Emily',
            lastName: 'Rodriguez',
            specialization: 'Pediatrics', 
            rating: 4.7, 
            ratingCount: 108,
            imageUrl: `https://ui-avatars.com/api/?name=Emily+Rodriguez&background=0D8ABC&color=fff&size=256`,
            availableToday: true
          },
          { 
            id: 4, 
            name: 'Dr. James Wilson', 
            firstName: 'James',
            lastName: 'Wilson',
            specialization: 'Orthopedics', 
            rating: 4.7, 
            ratingCount: 112,
            imageUrl: `https://ui-avatars.com/api/?name=James+Wilson&background=0D8ABC&color=fff&size=256`
          },
        ];
        setTopDoctors(mockDoctors);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecializations();
    fetchTopDoctors();
  }, []);

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    // Allow searching without login by redirecting to all-doctors page
    navigate(`/all-doctors?q=${searchTerm}&location=${searchLocation}&specialty=${searchSpecialty}`);
  };

  // Helper function for specialty icons - Improved with SVG icons and better categorization
  const getSpecialtyIcon = (specialtyName) => {
    const name = specialtyName.toLowerCase();
    
    // Return SVG icons for better visuals
    if (name.includes('cardio')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    }
    if (name.includes('neuro')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8c3.28 0 6-2.239 6-5 0 0-1.956-3-6-3-4.045 0-6 3-6 3 0 2.761 2.72 5 6 5z" />
          <path d="M6.5 17.5L12 13l5.5 4.5" />
          <path d="M18 2h-1v6.5l4 2.5" />
          <path d="M6 2h1v6.5L3 11" />
          <path d="M12 22v-6" />
        </svg>
      );
    }
    if (name.includes('ortho')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 14v7M12 14v7M16 14v7M4 8h16M6 4h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      );
    }
    if (name.includes('pediatric') || name.includes('child')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6M12 9v6M12 3a4 4 0 100 8 4 4 0 000-8zM12 21v-4" />
        </svg>
      );
    }
    if (name.includes('derma') || name.includes('skin')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a5 5 0 00-5 5v4a5 5 0 0010 0V8a5 5 0 00-5-5z" />
          <path d="M8 14v4M12 14v7M16 14v4" />
        </svg>
      );
    }
    if (name.includes('eye') || name.includes('ophthal')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        </svg>
      );
    }
    
    // Default medical icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v6M9 12h6M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Tabebak Logo Header */}
      <div className="bg-white w-full py-4 px-6 shadow-sm fixed top-0 left-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {tabebakLogo ? (
            <img src={tabebakLogo} alt="Tabebak Logo" className="h-12 mr-3" />
            ) : (
              <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <FiActivity className="text-white text-2xl" />
              </div>
            )}
            <div>
              <h1 className="text-blue-700 font-bold text-2xl">Tabebak</h1>
              <p className="text-gray-600 text-sm">Better healthcare for you</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const searchSection = document.getElementById('search-section');
                if (searchSection) {
                  searchSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center"
            >
              <FiSearch className="mr-2" />
              <span className="hidden md:inline">Find Doctors</span>
            </button>
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">Login</Link>
            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Register</Link>
          </div>
        </div>
      </div>

      {/* Hero Section - Enhanced with medical elements and gradients */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-32 pb-32 px-6 relative overflow-hidden mt-16">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <motion.div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-400 opacity-30"
            animate={{ 
              x: [0, 10, 0],
              y: [0, -10, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 20,
              ease: "easeInOut" 
            }}
          ></motion.div>
          <motion.div 
            className="absolute top-10 left-10 w-32 h-32 rounded-full bg-blue-400 opacity-20"
            animate={{ 
              x: [0, -15, 0],
              y: [0, 15, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 25,
              ease: "easeInOut" 
            }}
          ></motion.div>
          
          {/* Medical icons in background */}
          <div className="absolute top-1/4 right-10 text-white opacity-5 text-9xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="absolute bottom-10 left-1/4 text-white opacity-5 text-8xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-4 text-shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              رعاية صحية أفضل لك
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl mb-8 opacity-90"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Find and book the best doctors near you
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:flex justify-center mb-4 gap-8"
            >
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                  <FiCalendar className="text-xl" />
                </div>
                <span>Easy Booking</span>
              </div>
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                  <FiCheck className="text-xl" />
                </div>
                <span>Verified Doctors</span>
              </div>
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                  <FiStar className="text-xl" />
                </div>
                <span>Patient Reviews</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Search Box - Enhanced with better shadows and responsive design */}
      <div id="search-section" className="container mx-auto px-4 -mt-24 relative z-20">
        <motion.div 
          className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-800 font-semibold text-lg">Find Your Doctor</h3>
            <p className="text-blue-600 text-sm flex items-center">
              <FiInfo className="mr-1" /> No login required to search
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-blue-500" />
                <input
                  type="text"
                  placeholder="Search for doctors or specialties"
                  className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <div className="relative">
                <select
                  className="pl-4 pr-10 py-3 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 appearance-none"
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                >
                  <option value="">All Specialties</option>
                  {specializations.map(spec => (
                    <option key={spec.id} value={spec.name}>{spec.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-3 text-blue-500" />
                <input
                  type="text"
                  placeholder="City or area"
                  className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
              </div>
            </div>
            
            <div className="md:self-end">
              <button
                onClick={handleSearch}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors h-12 shadow-md hover:shadow-lg"
              >
                Search
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Medical Specialties Section - Enhanced with consistent icons and better spacing */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">الأطباء حسب التخصص</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Find the right specialist for your needs</p>
          <div className="w-20 h-1 bg-blue-500 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {specializations.slice(0, 12).map((specialty, index) => (
            <SpecialtyCard 
              key={specialty.id}
              specialty={specialty} 
              index={index}
            />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link 
            to="/doctors" 
            className="inline-flex items-center px-5 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors group"
          >
            View all specialties 
            <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>

      {/* Top Doctors Section - Enhanced with improved layout and visual hierarchy */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">الأطباء الأكثر تقييماً</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Book appointments with the highest-rated doctors</p>
            <div className="w-20 h-1 bg-blue-500 mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              // Enhanced loading placeholders for doctors
              [...Array(4)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 animate-pulse">
                  <div className="h-56 bg-gray-200 relative">
                    <div className="absolute top-2 right-2 bg-gray-300 h-5 w-16 rounded"></div>
                  </div>
                  <div className="p-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="flex mb-3 space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded w-4"></div>
                      ))}
                      <div className="h-4 bg-gray-200 rounded w-16 ml-2"></div>
                    </div>
                    <div className="h-10 bg-blue-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : (
              // Doctor cards are now handled by DoctorCard component
              topDoctors.map((doctor, index) => (
                <DoctorCard 
                  key={doctor.id}
                  doctor={doctor} 
                  delay={0.1 * index}
                  token={token}
                />
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/all-doctors" 
              className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 px-8 rounded-lg transition-colors inline-flex items-center shadow-sm hover:shadow"
            >
              View All Doctors <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Choose Us</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">We provide the best healthcare experience with our comprehensive services</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FiClock className="text-blue-600 text-xl" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Quick Appointments</h3>
            <p className="text-gray-600">Book appointments quickly and easily with our simple booking system</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FiCheck className="text-blue-600 text-xl" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Verified Doctors</h3>
            <p className="text-gray-600">All our doctors are verified professionals with validated credentials</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FiStar className="text-blue-600 text-xl" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Patient Reviews</h3>
            <p className="text-gray-600">Read authentic reviews from patients to choose the right doctor</p>
          </div>
        </div>
      </div>

      {/* Call to Action - Enhanced with more persuasive elements */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <motion.div 
            className="absolute top-1/4 right-1/6 w-48 h-48 rounded-full bg-white opacity-5"
            animate={{ 
              x: [0, 10, 0],
              y: [0, -10, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 15,
              ease: "easeInOut" 
            }}
          ></motion.div>
          <motion.div 
            className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-white opacity-5"
            animate={{ 
              x: [0, -15, 0],
              y: [0, 15, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 20,
              ease: "easeInOut" 
            }}
          ></motion.div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Join Over 10,000+ Satisfied Patients Today!
          </motion.h2>
          <motion.p 
            className="text-xl opacity-90 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Our platform connects you with top healthcare providers for fast, convenient, and reliable medical care
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link to="/register" className="bg-white text-blue-600 hover:bg-blue-50 font-medium py-3 px-8 rounded-md transition-colors transform hover:-translate-y-1 hover:shadow-lg duration-300 flex items-center justify-center">
              <FiUserPlus className="mr-2" /> Register Now - It's Free!
            </Link>
            <Link to="/login" className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-medium py-3 px-8 rounded-md transition-colors flex items-center justify-center">
              <FiUser className="mr-2" /> Login to Your Account
            </Link>
          </motion.div>
          
          {/* Countdown or limited offer (creates urgency) */}
          <motion.div
            className="bg-blue-700 py-2 px-4 rounded-full inline-block text-sm font-medium mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-red-400 mr-2"></span>
            Limited Time Offer: Register now and get a free consultation with our top specialists!
          </motion.div>
        </div>
      </div>

      {/* Testimonials Section - Enhanced with better design */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">ما يقوله المرضى عنّا</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Real experiences from patients who have used our platform</p>
            <div className="w-20 h-1 bg-blue-500 mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Mohamed",
                role: "Patient",
                quote: "Found a specialist and booked an appointment within minutes. The entire process was incredibly smooth and saved me so much time!",
                image: "https://randomuser.me/api/portraits/women/32.jpg",
                rating: 5
              },
              {
                name: "Ahmed Hassan",
                role: "Patient",
                quote: "Reading reviews from other patients helped me choose the right doctor for my condition. The platform made finding the perfect specialist easy.",
                image: "https://randomuser.me/api/portraits/men/45.jpg",
                rating: 5
              },
              {
                name: "Noura Ali",
                role: "Parent",
                quote: "I love how easy it is to manage all my family's medical appointments in one place. The reminders are extremely helpful!",
                image: "https://randomuser.me/api/portraits/women/67.jpg",
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white p-8 rounded-lg shadow-md border border-gray-100 relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
              >
                <div className="absolute -top-5 right-5 text-5xl text-blue-200 opacity-50 font-serif">"</div>
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full mr-4 border-2 border-blue-100"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                    <p className="text-gray-500 text-sm">{testimonial.role}</p>
                    <div className="flex text-yellow-400 text-sm mt-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 italic">{testimonial.quote}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Section - Enhanced with animations and better icons */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { 
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 mx-auto text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>, 
                number: <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                >
                  <CountUp start={0} end={10000} separator="," duration={2.5} />+
                </motion.span>, 
                label: "Registered Patients"
              },
              { 
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 mx-auto text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>, 
                number: <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                >
                  <CountUp start={0} end={500} separator="," duration={2.5} />+
                </motion.span>, 
                label: "Certified Doctors"
              },
              { 
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 mx-auto text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>, 
                number: <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                >
                  <CountUp start={0} end={25000} separator="," duration={2.5} />+
                </motion.span>, 
                label: "Appointments Booked"
              },
              { 
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 mx-auto text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>, 
                number: <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                >
                  <CountUp start={0} end={98} duration={2.5} />%
                </motion.span>, 
                label: "Satisfaction Rate" 
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-xl border border-blue-600/20 bg-gradient-to-b from-blue-800/50 to-blue-900/50 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                {stat.icon}
                <h3 className="text-4xl font-bold mb-2 text-white">{stat.number}</h3>
                <p className="text-blue-100">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Doctor Join Section - New section encouraging doctors to join */}
      <div className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <motion.div 
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image Column */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex items-center justify-center">
                <img 
                  src="https://img.freepik.com/free-vector/doctor-character-background_1270-84.jpg" 
                  alt="Doctor with digital technology" 
                  className="max-w-full h-auto rounded-lg shadow-lg transform -rotate-2"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://img.freepik.com/free-vector/doctors-concept-illustration_114360-1515.jpg";
                  }}
                />
              </div>
              
              {/* Content Column */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Are You a Doctor?</h2>
                <h3 className="text-xl text-blue-600 font-semibold mb-6">Join Tabebak and Grow Your Practice</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-4 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Expand Your Patient Base</h4>
                      <p className="text-gray-600">Connect with thousands of patients looking for quality healthcare</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-4 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Streamlined Appointment Management</h4>
                      <p className="text-gray-600">Easy-to-use tools to manage your schedule and appointments</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-4 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Build Your Online Reputation</h4>
                      <p className="text-gray-600">Showcase your expertise and collect patient reviews</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    to="/doctor-register" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <FiUserPlus className="mr-2" /> Register as a Doctor
                  </Link>
                  <Link 
                    to="/doctor-login" 
                    className="border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <FiUser className="mr-2" /> Doctor Login
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Final CTA Section - Enhanced with better design */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative px-6 py-12 md:p-12 text-center md:text-left md:flex items-center justify-between">
              {/* Background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white opacity-10"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-white opacity-10"></div>
              </div>
              
              {/* Content */}
              <div className="relative z-10 md:max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to experience better healthcare?</h2>
                <p className="text-blue-100 text-lg md:text-xl mb-8">
                  Join thousands of satisfied patients who have transformed their healthcare experience with our platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link 
                    to="/register" 
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Create Free Account
                  </Link>
                  <Link 
                    to="/doctors" 
                    className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold py-3 px-8 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Find Doctors
                  </Link>
                </div>
              </div>
              
              {/* Image */}
              <div className="hidden md:block relative z-10">
                <img 
                  src="/api/images/doctors/doctor-tablet.png" 
                  alt="Doctor using tablet" 
                  className="max-h-64 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://img.freepik.com/free-vector/doctors-concept-illustration_114360-1515.jpg?w=240";
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const CountUp = ({ start = 0, end, duration = 2.5, separator = ",", ...props }) => {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const animationRef = useRef();
  
  useEffect(() => {
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const value = Math.floor(progress * (end - start) + start);
      
      if (countRef.current !== value) {
        countRef.current = value;
        setCount(value);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };
    
    animationRef.current = requestAnimationFrame(step);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [start, end, duration]);
  
  return <span {...props}>{count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator)}</span>;
};

export default PublicHome; 