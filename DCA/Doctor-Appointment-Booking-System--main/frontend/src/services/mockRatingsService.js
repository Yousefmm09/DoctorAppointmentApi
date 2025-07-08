/**
 * Mock Ratings Service
 * 
 * This service provides mock data for doctor ratings when the real API endpoint
 * is not available. It generates realistic rating patterns to display in the UI.
 */

// Cache for storing generated ratings so they remain consistent between requests
const ratingsCache = new Map();

/**
 * Generate a random rating value between min and max
 * @param {number} min - Minimum rating value
 * @param {number} max - Maximum rating value
 * @returns {number} A rating value with one decimal place
 */
const generateRatingValue = (min = 3.5, max = 5.0) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
};

/**
 * Generate a realistic distribution of ratings for a doctor
 * @param {string|number} doctorId - The doctor's ID
 * @param {number} baseRating - The average rating to center around (optional)
 * @returns {Array} An array of rating objects
 */
const generateDoctorRatings = (doctorId, baseRating = null) => {
  // If we already generated ratings for this doctor, return them
  if (ratingsCache.has(doctorId)) {
    return ratingsCache.get(doctorId);
  }
  
  // Generate a base rating if none provided (weighted toward higher ratings)
  const avgRating = baseRating || generateRatingValue(4.0, 5.0);
  
  // Determine number of ratings (between 30 and 200)
  const ratingCount = Math.floor(Math.random() * 170) + 30;
  
  // Generate individual ratings with a distribution around the average
  const ratings = [];
  for (let i = 0; i < ratingCount; i++) {
    // Create a distribution that centers around the average rating
    let value;
    const distribution = Math.random();
    
    if (distribution < 0.6) {
      // 60% chance of rating near the average
      value = avgRating + (Math.random() * 0.6 - 0.3);
    } else if (distribution < 0.85) {
      // 25% chance of slightly lower rating
      value = avgRating - (Math.random() * 1.0 + 0.5);
    } else {
      // 15% chance of higher rating
      value = Math.min(5.0, avgRating + (Math.random() * 0.5));
    }
    
    // Ensure rating is between 1 and 5, and round to 0.5 increments
    value = Math.max(1.0, Math.min(5.0, value));
    value = Math.round(value * 2) / 2;
    
    // Create a rating object
    ratings.push({
      id: `rating-${doctorId}-${i}`,
      doctorId: doctorId,
      patientId: `patient-${Math.floor(Math.random() * 1000)}`,
      value: value,
      comment: null,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date in last 30 days
    });
  }
  
  // Cache the generated ratings
  ratingsCache.set(doctorId, ratings);
  
  return ratings;
};

/**
 * Get ratings for a specific doctor
 * @param {string|number} doctorId - The doctor's ID
 * @returns {Promise} A promise that resolves to an array of ratings
 */
export const getDoctorRatings = async (doctorId) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  try {
    return generateDoctorRatings(doctorId);
  } catch (error) {
    console.error("Error generating mock ratings:", error);
    return [];
  }
};

/**
 * Get the average rating for a doctor
 * @param {string|number} doctorId - The doctor's ID
 * @returns {Promise} A promise that resolves to an average rating object
 */
export const getDoctorAverageRating = async (doctorId) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  try {
    const ratings = await getDoctorRatings(doctorId);
    
    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }
    
    const sum = ratings.reduce((acc, rating) => acc + rating.value, 0);
    const average = parseFloat((sum / ratings.length).toFixed(1));
    
    return { average, count: ratings.length };
  } catch (error) {
    console.error("Error calculating average rating:", error);
    return { average: 0, count: 0 };
  }
};

export default {
  getDoctorRatings,
  getDoctorAverageRating
}; 