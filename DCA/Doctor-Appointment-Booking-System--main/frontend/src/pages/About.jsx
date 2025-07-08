import React from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiShield, FiClock, FiArrowRight } from 'react-icons/fi';

const About = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative bg-blue-600">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Medical background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            About Us
          </h1>
          <p className="mt-6 text-xl text-blue-100 max-w-3xl">
            We are dedicated to making healthcare accessible and convenient for everyone.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-medium tracking-wide uppercase">Our Mission</h2>
            <p className="mt-2 text-3xl leading-8 font-bold tracking-tight text-slate-800 sm:text-4xl">
              Transforming Healthcare Access
            </p>
            <p className="mt-4 max-w-2xl text-xl text-slate-500 lg:mx-auto">
              We believe that quality healthcare should be accessible to everyone, anywhere, anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-50 rounded-lg p-3">
                  <FiZap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-slate-800">Accessibility</h3>
              </div>
              <p className="mt-4 text-base text-slate-500">
                Making healthcare services easily accessible to everyone, regardless of location or time constraints.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-50 rounded-lg p-3">
                  <FiShield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-slate-800">Quality</h3>
              </div>
              <p className="mt-4 text-base text-slate-500">
                Ensuring the highest standards of medical care through verified and experienced healthcare professionals.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-50 rounded-lg p-3">
                  <FiClock className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-slate-800">Efficiency</h3>
              </div>
              <p className="mt-4 text-base text-slate-500">
                Streamlining the appointment process to save time for both patients and healthcare providers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">
              Our Team
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Meet the dedicated professionals behind our platform
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img
                    className="h-16 w-16 rounded-full border-2 border-slate-50 shadow-sm"
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"
                    alt="Team member"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-slate-800">Dr. Sarah Johnson</h3>
                  <p className="text-sm text-slate-500">Medical Director</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img
                    className="h-16 w-16 rounded-full border-2 border-slate-50 shadow-sm"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"
                    alt="Team member"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-slate-800">Michael Chen</h3>
                  <p className="text-sm text-slate-500">Technical Lead</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img
                    className="h-16 w-16 rounded-full border-2 border-slate-50 shadow-sm"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"
                    alt="Team member"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-slate-800">Emily Rodriguez</h3>
                  <p className="text-sm text-slate-500">Patient Care Coordinator</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to experience better healthcare?</span>
            <span className="block text-blue-100">Join us today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <Link
              to="/appointment"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-blue-700 bg-white hover:bg-blue-50 transition-colors"
            >
              Get started <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
