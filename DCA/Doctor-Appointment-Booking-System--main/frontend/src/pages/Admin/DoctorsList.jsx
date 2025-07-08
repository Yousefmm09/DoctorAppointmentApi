import React, { useContext, useEffect, useState, useMemo } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { getProfileImageUrl } from '../../utils/imageHelper'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import Modal from 'react-modal'
import { useNavigate, Link } from 'react-router-dom'
import { FaSearch, FaFilter, FaUserMd, FaEye, FaEdit, FaStethoscope, FaPhone, FaEnvelope, FaHospital, FaTrash } from 'react-icons/fa'
import { AppContext } from '../../context/AppContext'
import AdminDoctorCard from '../../components/AdminDoctorCard'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const DoctorsList = () => {
  const { getAllDoctors, deleteDoctor, isAuthenticated } = useContext(AdminContext)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [specializationFilter, setSpecializationFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [filteredDoctors, setFilteredDoctors] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    bySpecialty: {},
    averageFee: 0,
    activeDoctors: 0
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [doctorToDelete, setDoctorToDelete] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getAllDoctors()
        if (data) {
          // Process the data to ensure proper structure
          const processedData = data.map(doctor => ({
            id: doctor.id,
            firstName: doctor.firstName || '',
            lastName: doctor.lastName || '',
            name: doctor.firstName && doctor.lastName 
              ? `${doctor.firstName} ${doctor.lastName}`
              : doctor.name || 'Unknown Doctor',
            email: doctor.email || '',
            phone: doctor.phoneNumber || doctor.phone || '',
            specialization: doctor.specializationName || doctor.specialization || 'General',
            imageUrl: doctor.imageUrl || doctor.profilePicture || '',
            profilePicture: doctor.profilePicture || doctor.imageUrl || '',
            currentFee: doctor.consultationFee || doctor.currentFee || 0,
            isAvailable: doctor.isAvailable !== undefined ? doctor.isAvailable : false,
            address: doctor.address || '',
            bio: doctor.bio || '',
            education: doctor.education || '',
            clinicName: doctor.clinicName || doctor.clinic?.name || '',
            workingHours: doctor.workingHours || ''
          }))
          
          setDoctors(processedData)
          setFilteredDoctors(processedData)
          setSpecializations([...new Set(processedData.map(doctor => doctor.specialization).filter(Boolean))])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load doctors and specializations')
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
    fetchData()
    }
  }, [getAllDoctors, isAuthenticated])

  useEffect(() => {
    let result = [...doctors]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(doctor => 
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply specialty filter
    if (specializationFilter !== 'All') {
      result = result.filter(doctor => 
        doctor.specialization === specializationFilter
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = sortBy === 'name' ? a.name : a[sortBy]
      const bValue = sortBy === 'name' ? b.name : b[sortBy]
      
      if (aValue === undefined || bValue === undefined) return 0
      
      return sortOrder === 'asc' 
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })

    // Calculate statistics
    const specialtyCount = {}
    let totalFee = 0
    let activeCount = 0

    doctors.forEach(doctor => {
      if (doctor.specialization) {
        specialtyCount[doctor.specialization] = (specialtyCount[doctor.specialization] || 0) + 1
      }
      // Convert fee to a number to ensure proper calculation
      const fee = parseFloat(doctor.currentFee) || 0
      totalFee += fee
      if (doctor.isAvailable) activeCount++
    })

    setStats({
      total: doctors.length,
      bySpecialty: specialtyCount,
      averageFee: doctors.length ? totalFee / doctors.length : 0,
      activeDoctors: activeCount
    })

    setFilteredDoctors(result)
  }, [doctors, searchTerm, specializationFilter, sortBy, sortOrder])

  const handleDelete = (doctorId) => {
    setDoctorToDelete(doctorId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (doctorToDelete) {
      setLoading(true)
      try {
        await deleteDoctor(doctorToDelete)
        toast.success('Doctor deleted successfully')
      } catch (error) {
        toast.error('Failed to delete doctor')
      } finally {
        setLoading(false)
        setShowDeleteModal(false)
        setDoctorToDelete(null)
      }
    }
  }

  const handleViewDetails = (doctor) => {
    setSelectedDoctor(doctor)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDoctor(null)
  }

  if (loading && !doctors.length) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      {/* Professional Header Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex flex-col gap-2 text-white">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
              <FaUserMd className="text-white/80" />
              Doctor Management
            </h1>
            <p className="text-blue-100 md:text-lg">
              Manage and monitor all registered doctors in the system
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center bg-white/10 rounded-lg px-3 py-1.5">
                <span className="text-white font-medium mr-2">Total:</span>
                <span className="text-white font-bold">{stats.total}</span>
              </div>
              <div className="flex items-center bg-white/10 rounded-lg px-3 py-1.5">
                <span className="text-white font-medium mr-2">Active:</span>
                <span className="text-white font-bold">{stats.activeDoctors}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center md:justify-end">
            <Link
              to="/admin/add-doctor"
              className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Doctor
            </Link>
            <Link
              to="/admin/add-specialization"
              className="bg-blue-700 text-white hover:bg-blue-600 px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 border border-blue-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Specialization
            </Link>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl -z-0 transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute left-0 bottom-0 w-40 h-40 bg-blue-400 rounded-full opacity-10 blur-2xl -z-0 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-')
                setSortBy(sort)
                setSortOrder(order)
              }}
              className="w-full appearance-none px-4 py-2.5 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name-asc">Sort by Name (A-Z)</option>
              <option value="name-desc">Sort by Name (Z-A)</option>
              <option value="specialization-asc">Sort by Specialty (A-Z)</option>
              <option value="specialization-desc">Sort by Specialty (Z-A)</option>
              <option value="currentFee-asc">Sort by Fee (Low to High)</option>
              <option value="currentFee-desc">Sort by Fee (High to Low)</option>
            </select>
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
            onClick={() => {
              setLoading(true)
              getAllDoctors().finally(() => setLoading(false))
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link
            to="/admin/add-doctor"
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Doctor
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <FaUserMd className="text-blue-600 text-xl" />
          </div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Total Doctors</h3>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <svg className="text-green-600 text-xl w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Active Doctors</h3>
            <p className="text-2xl font-bold text-green-600">{stats.activeDoctors}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <svg className="text-blue-600 text-xl w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Average Fee</h3>
            <p className="text-2xl font-bold text-blue-600">${parseFloat(stats.averageFee).toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="rounded-full bg-purple-100 p-3 mr-4">
            <FaStethoscope className="text-purple-600 text-xl" />
          </div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Specialties</h3>
            <p className="text-2xl font-bold text-purple-600">{Object.keys(stats.bySpecialty).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Doctors by Specialty
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.keys(stats.bySpecialty).map(key => ({ 
                    name: key || 'Other', 
                    value: stats.bySpecialty[key] 
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.keys(stats.bySpecialty).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Fee Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDoctors.slice(0, 5).map(doc => ({ 
                name: doc.name.split(' ')[0] || 'Doctor',  // Show first name only to save space
                fee: doc.currentFee 
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(0, 0, 0, 0.05)'}} />
                <Bar dataKey="fee" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filteredDoctors.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center"
          >
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No doctors found matching your criteria.</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSpecializationFilter('All');
              }}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <AdminDoctorCard
                key={doctor.id}
                doctor={doctor}
                onViewDetails={handleViewDetails}
                onDelete={handleDelete}
                onEdit={(doctor) => navigate(`/admin/edit-doctor/${doctor.id}`)}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
        ariaHideApp={false}
      >
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
          <p className="mb-6">Are you sure you want to delete this doctor? This action cannot be undone.</p>
          <div className="flex justify-center gap-4">
            <button
              className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={confirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Doctor Details Modal */}
      {isModalOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4">
              <h3 className="text-xl font-bold">Doctor Details</h3>
              <button 
                onClick={handleCloseModal} 
                className="text-white hover:bg-white/10 p-1 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                    <img
                      src={getProfileImageUrl(selectedDoctor.imageUrl)}
                      alt={`Dr. ${selectedDoctor.name}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = "/assets/placeholder-doctor.png" }}
                    />
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FaPhone className="text-blue-500 w-4 h-4" />
                        <span className="text-gray-700">{selectedDoctor.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaEnvelope className="text-blue-500 w-4 h-4" />
                        <span className="text-gray-700">{selectedDoctor.email || 'Not provided'}</span>
                      </div>
                      {selectedDoctor.clinicName && (
                        <div className="flex items-center gap-2">
                          <FaHospital className="text-blue-500 w-4 h-4" />
                          <span className="text-gray-700">{selectedDoctor.clinicName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedDoctor.name}</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {selectedDoctor.specialization || 'Specialist'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedDoctor.isAvailable 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedDoctor.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h4 className="font-medium text-gray-700 mb-1">Consultation Fee</h4>
                      <p className="text-xl font-semibold text-blue-600">${selectedDoctor.currentFee}</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h4 className="font-medium text-gray-700 mb-1">Experience</h4>
                      <p className="text-xl font-semibold text-blue-600">{selectedDoctor.experience || 'N/A'} years</p>
                    </div>
                  </div>
                  
                  {selectedDoctor.bio && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">About</h4>
                      <p className="text-gray-600">{selectedDoctor.bio}</p>
                    </div>
                  )}
                  
                  {selectedDoctor.education && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Education</h4>
                      <p className="text-gray-600">{selectedDoctor.education}</p>
                    </div>
                  )}
                  
                  {selectedDoctor.address && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Address</h4>
                      <p className="text-gray-600">{selectedDoctor.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

export default DoctorsList
