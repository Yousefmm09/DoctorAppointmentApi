import React from 'react';
import { Link } from 'react-router-dom';
import { FiPhone, FiMail, FiMapPin, FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: About */}
          <div>
            <h2 className="text-2xl font-bold mb-6">TABEBAK</h2>
            <p className="mb-4 text-gray-400 leading-relaxed">
              Your trusted partner in healthcare. We connect patients with the best doctors, making healthcare accessible and convenient for everyone.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <FiFacebook className="text-white" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <FiTwitter className="text-white" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <FiInstagram className="text-white" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <FiLinkedin className="text-white" />
              </a>
            </div>
          </div>
          
          {/* Column 2: Company */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/public/home" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link>
              </li>
              <li>
                <Link to="/gdpr-settings" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3: Services */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Services</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/doctors" className="text-gray-400 hover:text-white transition-colors">Find Doctors</Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Book Appointment</Link>
              </li>
              <li>
                <Link to="/doctors" className="text-gray-400 hover:text-white transition-colors">Specialties</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">Health Tips</Link>
              </li>
            </ul>
          </div>
          
          {/* Column 4: Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Support</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <FiPhone className="text-indigo-500 mt-1 mr-3" />
                <span className="text-gray-400">+1 (234) 567-890</span>
              </li>
              <li className="flex items-start">
                <FiMail className="text-indigo-500 mt-1 mr-3" />
                <span className="text-gray-400">support@tabebak.com</span>
              </li>
              <li className="flex items-start">
                <FiMapPin className="text-indigo-500 mt-1 mr-3" />
                <span className="text-gray-400">123 Medical Street, Healthcare City</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Copyright Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-400">
              &copy; {currentYear} TABEBAK. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex space-x-6">
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
