import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { getProfileImageUrl } from '../utils/imageHelper'
import { toast } from 'react-toastify'

const RelatedDoctor = ({ speciality, docId }) => {
  const { doctors, backendUrl } = useContext(AppContext)
  const navigate = useNavigate()
  const [relDoc, setRelDoc] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRelatedDoctors = async () => {
      try {
        setLoading(true)
        setError(null)
        if (speciality) {
          const response = await fetch(`${backendUrl}/api/Doctor/GetDoctorBySpecializationName/${encodeURIComponent(speciality)}`)
          if (!response.ok) {
            throw new Error('Failed to fetch related doctors')
          }
          const data = await response.json()
          // Filter out the current doctor and limit to 5 doctors
          const filteredDoctors = data
            .filter(doc => doc.id !== parseInt(docId))
            .slice(0, 5)
            .map(doctor => ({
              ...doctor,
              availability: Math.random() > 0.2 // Simulating availability
            }))
          setRelDoc(filteredDoctors)
        }
      } catch (error) {
        console.error('Error fetching related doctors:', error)
        setError('Failed to load related doctors')
        toast.error('Failed to load related doctors')
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedDoctors()
  }, [speciality, docId, backendUrl])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    )
  }

  if (relDoc.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No other doctors available in this specialization
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {relDoc.map((doctor) => (
        <div
          key={doctor.id}
          onClick={() => {
            navigate(`/appointment/book/${doctor.id}`)
            window.scrollTo(0, 0)
          }}
          className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative h-48">
            <img
              className="w-full h-full object-cover"
              src={getProfileImageUrl(doctor.profilePicture)}
              alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
              onError={(e) => { e.target.src = "/images/default-doctor.jpg" }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${doctor.availability ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-white text-sm">{doctor.availability ? 'Available' : 'Unavailable'}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Dr. {doctor.firstName} {doctor.lastName}
            </h3>
            <p className="text-primary text-sm font-medium">{doctor.specializationName}</p>
            <div className="mt-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-600">${doctor.currentFee}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-600">{doctor.location || 'Location not specified'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default RelatedDoctor