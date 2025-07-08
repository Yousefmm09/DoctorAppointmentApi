import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const Banner = () => {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl px-6 sm:px-10 md:px-14 lg:px-12 my-8 md:my-12 mx-4 md:mx-8 shadow-xl'
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 10%, transparent 10%), 
                             radial-gradient(circle, rgba(255,255,255,0.1) 10%, transparent 10%)`,
          backgroundPosition: `0 0, 20px 20px`,
          backgroundSize: `40px 40px`
        }}></div>
      </div>

      {/* Content */}
      <div className='relative flex flex-col md:flex-row items-center justify-between py-10 sm:py-12 md:py-16 lg:py-20'>
        {/* Left Side - Text Content */}
        <div className='flex-1 text-center md:text-left lg:pl-5 space-y-6 mb-8 md:mb-0'>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight'
          >
            <span className="block">Book Appointment</span>
            <span className="block mt-2">With 100+ Trusted Doctors</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className='text-white/90 text-lg md:text-xl max-w-xl'
          >
            Find and book appointments with the best healthcare professionals in your area. Fast, easy, and reliable.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => { navigate('/login'); window.scrollTo(0, 0) }}
            className='bg-white text-blue-600 text-lg px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 mx-auto md:mx-0'
          >
            Create account
            <motion.svg
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </motion.svg>
          </motion.button>
        </div>

        {/* Right Side - Image */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className='hidden md:block md:w-1/2 lg:w-[370px] relative'
        >
          <motion.img 
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            className='w-full h-auto object-contain max-h-[400px] drop-shadow-2xl'
            src="/assets/appointment_img.png" 
            alt="Doctor consultation illustration"
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = 'https://i.imgur.com/QIxIKBH.png'; // Fallback to a placeholder image
            }}
          />
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>
      <div className="absolute top-0 left-0 w-24 h-24 bg-white/20 rounded-full blur-3xl"></div>
    </motion.div>
  )
}

export default Banner