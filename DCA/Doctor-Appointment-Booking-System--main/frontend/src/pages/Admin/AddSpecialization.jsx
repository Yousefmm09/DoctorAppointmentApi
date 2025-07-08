import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminContext } from '../../context/AdminContext';
import { toast } from 'react-toastify';
import { FaStethoscope } from 'react-icons/fa';
import axios from 'axios';

const AddSpecialization = () => {
  const navigate = useNavigate();
  const { backendUrl, isAuthenticated } = useContext(AdminContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.post(
        `${backendUrl}/api/Specializations/AddSpecialization`,
        formData,
        config
      );

      if (response.status === 201 || response.status === 200) {
        toast.success('Specialization added successfully!');
        navigate('/admin/doctors');
      }
    } catch (error) {
      console.error('Error adding specialization:', error);
      toast.error(error.response?.data?.message || 'Failed to add specialization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div className="flex flex-col gap-1 text-white">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <FaStethoscope className="text-white/80" />
              Add New Specialization
            </h1>
            <p className="text-blue-100">
              Create a new medical specialization in the system
            </p>
          </div>
          
          <button
            onClick={() => navigate('/admin/doctors')}
            className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Doctors List
          </button>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl -z-0 transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute left-0 bottom-0 w-40 h-40 bg-blue-400 rounded-full opacity-10 blur-2xl -z-0 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg mr-3 shadow-sm">
                <FaStethoscope className="text-white" />
              </div>
              Specialization Details
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Cardiology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Describe the specialization and its focus areas..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/doctors')}
              className="px-5 py-2.5 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Specialization
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSpecialization; 