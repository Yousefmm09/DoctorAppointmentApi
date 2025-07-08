import React from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiCalendar, FiUser, FiMessageSquare, FiChevronRight } from 'react-icons/fi';

const PatientDashboard = () => {
  const currentTime = new Date();
  const hours = currentTime.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600">
      {/* Navigation */}
      <nav className="p-4 flex justify-end space-x-6">
        <Link to="/doctors" className="text-white/80 hover:text-white">ALL DOCTORS</Link>
        <Link to="/about" className="text-white/80 hover:text-white">ABOUT</Link>
        <Link to="/contact" className="text-white/80 hover:text-white">CONTACT</Link>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-800 text-sm font-medium">
            YM
          </div>
          <span className="text-white">yousef mohsen</span>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">PATIENT DASHBOARD</h1>
          <h2 className="text-4xl font-bold text-white mb-4">{greeting} yousef</h2>
          <p className="text-white/90">
            Welcome to your health dashboard. Find doctors, book appointments, and manage your healthcare journey all in one place.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-12">
          <Link
            to="/find-doctors"
            className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <FiSearch className="w-5 h-5 mr-2" />
            Find Doctors
          </Link>
          <Link
            to="/my-appointments"
            className="inline-flex items-center px-6 py-3 bg-blue-400/20 text-white rounded-lg hover:bg-blue-400/30 transition-colors"
          >
            <FiCalendar className="w-5 h-5 mr-2" />
            My Appointments
          </Link>
        </div>

        {/* Upcoming Appointment Card */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FiCalendar className="w-5 h-5 mr-2 text-blue-500" />
              Upcoming Appointment
            </h3>
            <Link to="/appointments" className="text-blue-500 hover:text-blue-600">
              All Appointments
            </Link>
          </div>
          
          <div className="border-b pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">nader mohamed</h4>
                <p className="text-sm text-gray-500">General</p>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <span className="mr-4">June 22, 2023</span>
                  <span>08:00:00</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    Appointment #1
                  </span>
                </div>
              </div>
              <Link
                to="/appointment-details"
                className="text-blue-500 hover:text-blue-600 flex items-center"
              >
                View Details
                <FiChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats and Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Total Appointments */}
          <div className="bg-white/90 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Total Appointments</h3>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">1</span>
              <span className="ml-2 text-sm text-gray-500">0 completed</span>
            </div>
          </div>

          {/* My Health Profile */}
          <div className="bg-white/90 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">My Health Profile</h3>
            <h4 className="text-lg mb-4">Personal Details</h4>
            <Link
              to="/profile"
              className="text-blue-500 hover:text-blue-600 flex items-center"
            >
              Update Profile
              <FiChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Messages */}
          <div className="bg-white/90 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Messages</h3>
            <h4 className="text-lg mb-4">Chat with doctors</h4>
            <Link
              to="/messages"
              className="text-green-500 hover:text-green-600 flex items-center"
            >
              View Messages
              <FiChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard; 