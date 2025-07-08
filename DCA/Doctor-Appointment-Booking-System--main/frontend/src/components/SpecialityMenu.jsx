import React, { useState } from 'react'
import { specialityData } from '../assets/assets'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const SpecialityMenu = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='flex flex-col items-center gap-8 py-16 text-gray-800'
      id='speciality'
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-4"
      >
        <h1 className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent'>
          Find by Speciality
        </h1>
        <p className='text-gray-600 max-w-2xl mx-auto text-lg'>
          Browse through our extensive list of trusted doctors and schedule your appointment hassle-free.
        </p>
      </motion.div>

      <div className='w-full max-w-7xl mx-auto px-4'>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6'>
          {specialityData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
            >
              <Link 
                onClick={() => window.scrollTo(0, 0)} 
                to={`/doctors/${item.speciality}`}
                className='flex flex-col items-center p-6 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group'
              >
                <motion.div
                  animate={{ 
                    scale: hoveredIndex === index ? 1.1 : 1,
                    rotate: hoveredIndex === index ? 5 : 0
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4"
                >
                  <img 
                    className='w-full h-full object-contain transition-transform duration-300 group-hover:scale-110' 
                    src={item.image} 
                    alt={item.speciality}
                  />
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </motion.div>
                
                <motion.p 
                  animate={{ 
                    color: hoveredIndex === index ? '#3B82F6' : '#1F2937',
                    y: hoveredIndex === index ? -2 : 0
                  }}
                  className='text-center font-medium text-sm sm:text-base transition-colors duration-300'
                >
                  {item.speciality}
                </motion.p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center"
      >
        <p className="text-gray-500 text-sm">
          Can't find what you're looking for?{' '}
          <Link to="/doctors" className="text-primary hover:underline">
            View all doctors
          </Link>
        </p>
      </motion.div>
    </motion.div>
  )
}

export default SpecialityMenu