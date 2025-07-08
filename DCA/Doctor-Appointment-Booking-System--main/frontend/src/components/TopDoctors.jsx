import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfileImageUrl } from '../utils/imageHelper';

const TopDoctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  // Fetch top doctors from API
  useEffect(() => {
    const fetchTopDoctors = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5109/api/Doctor');
        if (!response.ok) {
          throw new Error('Failed to fetch doctors');
        }
        const data = await response.json();
        if (data && data.data && Array.isArray(data.data)) {
          setDoctors(data.data);
          setFilteredDoctors(data.data);
        } else {
          console.warn('Invalid response format from doctors API:', data);
          setDoctors([]);
          setFilteredDoctors([]);
        }
      } catch (error) {
        console.error('Error fetching top doctors:', error);
        toast.error('Failed to load doctors. Please try again later.');
        setDoctors([]);
        setFilteredDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopDoctors();
  }, []);

  // Filter doctors based on search term and specialty
  useEffect(() => {
    let filtered = doctors;
    
    if (searchTerm) {
      filtered = filtered.filter(doctor => 
        doctor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specializationName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedSpecialty) {
      filtered = filtered.filter(doctor => 
        doctor.specializationName === selectedSpecialty
      );
    }
    
    setFilteredDoctors(filtered);
  }, [searchTerm, selectedSpecialty, doctors]);

  // Get unique specialties for filter dropdown
  const specialties = [...new Set(doctors.map(doctor => doctor.specializationName))];

  return (
    <div className='flex flex-col items-center gap-6 my-16 text-gray-900 md:mx-10'>
      <h1 className='text-3xl font-medium'>Find Your Doctor</h1>
      <p className='sm:w-1/3 text-center text-sm text-gray-600'>
        Search and book appointments with our trusted healthcare professionals.
      </p>

      {/* Search and Filter Section */}
      <div className='w-full max-w-4xl flex flex-col sm:flex-row gap-4 px-4'>
        <div className='flex-1'>
          <input
            type='text'
            placeholder='Search by name or specialty...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary'
          />
        </div>
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className='px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary'
        >
          <option value=''>All Specialties</option>
          {specialties.map((specialty, index) => (
            <option key={index} value={specialty}>{specialty}</option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className='flex justify-center items-center py-12'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
        </div>
      ) : (
        <>
          {/* No Results Message */}
          {filteredDoctors.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>
              No doctors found matching your criteria.
            </div>
          ) : (
            <div className='w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4'>
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  onClick={() => {
                    navigate(`/appointment/book/${doctor.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className='bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
                >
                  <div className='relative h-48'>
                    <img
                      className='w-full h-full object-cover'
                      src={getProfileImageUrl(doctor.profilePicture)}
                      alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                      onError={(e) => { e.target.src = '/images/default-doctor.jpg' }}
                    />
                    <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4'>
                      <div className='flex items-center gap-2'>
                        <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                        <span className='text-white text-sm'>Available</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className='p-4'>
                    <h3 className='text-lg font-semibold text-gray-900'>
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <p className='text-primary text-sm font-medium'>{doctor.specializationName}</p>
                    <div className='mt-2 flex items-center gap-2'>
                      <svg className='w-4 h-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                      <span className='text-sm text-gray-600'>${doctor.currentFee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* View More Button */}
      <button
        onClick={() => {
          navigate('/doctors');
          window.scrollTo(0, 0);
        }}
        className='bg-primary text-white px-8 py-3 rounded-full mt-8 hover:bg-primary/90 transition-colors'
      >
        View All Doctors
      </button>
    </div>
  );
};

export default TopDoctors;