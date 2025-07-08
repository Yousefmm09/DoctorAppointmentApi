import axios from 'axios';

const API_BASE_URL = 'http://localhost:5109/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to add auth token and handle FormData
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Check if the data is FormData and adjust Content-Type accordingly
        if (config.data instanceof FormData) {
            // Let the browser set the Content-Type header with the correct boundary
            config.headers['Content-Type'] = undefined;
            console.log('FormData detected, Content-Type header removed to let browser handle it');
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Log detailed error information
            console.error('API Error Details:', {
                status: error.response.status,
                statusText: error.response.statusText,
                url: error.config.url,
                method: error.config.method,
                data: error.response.data,
                headers: error.config.headers,
                requestData: error.config.data instanceof FormData 
                    ? 'FormData object (cannot display content)' 
                    : error.config.data
            });
            
            // Handle specific error cases
            switch (error.response.status) {
                case 401:
                    // Unauthorized - clear local storage and redirect to login
                    localStorage.clear();
                    window.location.href = '/login';
                    break;
                case 403:
                    // Forbidden - redirect to home
                    window.location.href = '/';
                    break;
                case 415:
                    console.error('Unsupported Media Type: The server expects a different content type.');
                    break;
                default:
                    // Handle other errors
                    console.error('API Error:', error.response.data);
            }
        }
        return Promise.reject(error);
    }
);

// ChatBot API endpoints
const chatService = {
    sendMessage: (data) => api.post('/ChatBot/chat', data),
    testConnection: () => api.get('/ChatBot/test'),
    getConversations: () => api.get('/Chat/conversations'),
    getUnreadCount: () => api.get('/Chat/unreadCount'),
    getMessages: (contactId, contactType = 'Patient', page = 1, pageSize = 20) => 
        api.get('/Chat/messages', { params: { contactId, contactType, page, pageSize }}),
    markAsRead: (messageId) => api.post('/Chat/markAsRead', { messageId })
};

// Auth API endpoints
const authService = {
    login: async (credentials) => {
        return api.post('/Account/login', credentials);
    },
    register: async (userData) => {
        return api.post('/Account/Registration/patient', userData);
    },
    registerDoctor: async (userData) => {
        return api.post('/Account/registration/doctor', userData);
    },
    checkEmailConfirmation: async (userId) => {
        return api.get(`/Account/CheckEmailConfirmation/${userId}`);
    },
    resendConfirmationEmail: async (email) => {
        return api.post('/Account/ResendEmailConfirmation', { email });
    },
    forgotPassword: async (email) => {
        return api.post('/Account/forgot-password', { email });
    },
    resetPassword: async (resetData) => {
        return api.post('/Account/reset-password', resetData);
    },
    logout: () => {
        localStorage.clear();
        window.location.href = '/login';
    }
};

// Doctor API endpoints
const doctorService = {
    getAllDoctors: () => api.get('/doctor'),
    getDoctorById: (id) => api.get(`/doctor/${id}`),
    getDoctorsBySpecialty: (specialty) => api.get(`/doctor/GetDoctorBySpecializationName/${specialty}`),
    updateDoctor: (id, data) => api.put(`/doctor/update-doctor-profile/${id}`, data),
    deleteDoctor: (id) => api.delete(`/doctor/delete-doctor/${id}`),
    addDoctor: (data) => api.post('/doctor/add-doctor', data),
    getDoctorAppointments: (id) => api.get(`/doctor/get-appointment-from-doctor/${id}`),
    getDoctorDashboardData: (id) => api.get(`/doctor/doctor/dashboard/${id}`),
    getDoctorsWithPatientAppointments: (patientId) => api.get(`/doctor/patient-appointments/${patientId}`)
};

// Appointment API endpoints
const appointmentService = {
    getAllAppointments: () => api.get('/Appointment'),
    getAppointmentById: (id) => api.get(`/Appointment/${id}`),
    createAppointment: (data) => api.post('/Appointment', data),
    updateAppointment: (id, data) => api.put(`/Appointment/${id}`, data),
    deleteAppointment: (id) => api.delete(`/Appointment/${id}`),
    getMyAppointments: () => api.get('/Appointment/my-appointments'),
    getAvailableSlots: (doctorId, date) => api.get('/Appointment/available-slots', { params: { doctorId, date }}),
    checkSlotAvailability: (doctorId, date, time) => api.get('/Appointment/check-availability', { params: { doctorId, date, time }}),
    getUpcomingAppointments: () => api.get('/Appointment/upcoming'),
    getPastAppointments: () => api.get('/Appointment/past'),
    updateAppointmentStatus: (appointmentId, status) => api.put(`/Appointment/${appointmentId}/status`, { status }),
    rescheduleAppointment: (appointmentId, newDate, newTime) => api.put(`/Appointment/${appointmentId}/reschedule`, { date: newDate, time: newTime })
};

// Account API endpoints
const accountService = {
    getProfile: () => api.get('/account/profile'),
    updateProfile: (data) => api.put('/account/profile', data),
    changePassword: (data) => api.post('/account/change-password', data)
};

// GDPR API endpoints
const gdprService = {
    requestDataRemoval: (userData) => api.post('/Account/gdpr/data-removal', userData),
    requestDataExport: (userData) => api.post('/Account/gdpr/data-export', userData),
    checkDataRemovalStatus: (requestId) => api.get(`/Account/gdpr/data-removal/${requestId}`),
    cancelDataRemovalRequest: (requestId) => api.delete(`/Account/gdpr/data-removal/${requestId}`)
};

// Phone Verification API endpoints
const phoneVerificationService = {
    requestVerification: (data) => api.post('/PhoneVerification/request-code', data),
    verifyCode: (data) => api.post('/PhoneVerification/verify-code', data)
};

// Specialization API endpoints
const specializationService = {
    getAllSpecializations: () => api.get('/specializations/AllSpecializations'),
    getSpecializationById: (id) => api.get(`/specializations/${id}`),
    createSpecialization: (data) => api.post('/specializations/AddSpecialization', data),
    updateSpecialization: (id, data) => api.put(`/specializations/${id}`, data),
    deleteSpecialization: (id) => api.delete(`/specializations/${id}`)
};

// Rating API endpoints
const ratingService = {
    getDoctorRatings: (doctorId) => api.get(`/ratings/doctor/${doctorId}`),
    getDoctorRatingsPublic: (doctorId) => {
        if (isNaN(parseInt(doctorId))) {
            console.warn('[ratingService.getDoctorRatingsPublic] Attempted to call with non-numeric doctorId:', doctorId);
            return Promise.resolve({ data: [], error: 'Non-numeric ID passed directly to getDoctorRatingsPublic' });
        }
        return api.get(`/ratings/doctor-public?doctorId=${doctorId}`);
    },
    getAverageRating: (doctorId) => api.get(`/ratings/doctor/average?doctorId=${doctorId}`),
    submitRating: (data) => api.post('/ratings', data),
    updateRating: (id, data) => api.put(`/ratings/${id}`, data),
    deleteRating: (id) => api.delete(`/ratings/${id}`),
    getMyRatings: () => api.get('/ratings/my-ratings'),
    getDoctorRatingsWithFallback: async (doctorId, userRole) => {
        try {
            let endpoint = '';
            let numericDoctorId = NaN;

            if (doctorId !== undefined && doctorId !== null) {
                // Attempt to parse doctorId only if it's not already a number and seems parsable
                if (typeof doctorId === 'string' || typeof doctorId === 'number') {
                    numericDoctorId = parseInt(doctorId);
                } else if (typeof doctorId === 'object' && doctorId.id) { // If doctorId is an object with an id property
                    numericDoctorId = parseInt(doctorId.id);
                }
            }

            if (userRole === 'Doctor') {
                // Backend: GetMyDoctorRatings([FromQuery] int? doctorId = null)
                // This endpoint uses token if doctorId query param is absent or unparseable to int?
                endpoint = '/ratings/doctor';
                if (!isNaN(numericDoctorId)) {
                    // Send doctorId only if it's a valid number
                    endpoint += `?doctorId=${numericDoctorId}`;
                }
                // If numericDoctorId is NaN (e.g., doctorId was "nader" or complex object without .id),
                // the doctorId query param is omitted. Backend will use token. This is the desired behavior.
                console.log(`[ratingService] Doctor role: Calling: ${endpoint} (original doctorId: "${doctorId}")`);
                return await api.get(endpoint);

            } else if (userRole === 'Patient' || userRole === 'Admin' || !userRole) {
                // Backend: GetDoctorRatingsPublic(int doctorId) - strictly expects an int
                if (isNaN(numericDoctorId)) {
                    console.warn(`[ratingService] Public view: doctorId "${doctorId}" is not a valid numeric ID. Aborting call to /ratings/doctor-public.`);
                    return { data: [], error: 'Invalid Doctor ID for public ratings view.' }; // Return specific structure
                }
                endpoint = `/ratings/doctor-public?doctorId=${numericDoctorId}`;
                console.log(`[ratingService] Public view: Calling: ${endpoint}`);
                return await api.get(endpoint);

            } else {
                console.warn("[ratingService.getDoctorRatingsWithFallback] Unhandled user role or missing role:", userRole);
                return { data: [], error: 'Unhandled user role for fetching ratings.' };
            }

        } catch (error) {
            // This catch is for unexpected errors during the logic above or if api.get itself throws
            // The common api.js interceptor should handle standard AxiosErrors from api.get()
            console.error("[ratingService.getDoctorRatingsWithFallback] Unexpected error:", error);
            throw error; // Re-throw for the component to handle as a generic API error
        }
    }
};

// Patient API endpoints
const patientService = {
    getPatientProfile: () => api.get('/Patient/profile'),
    updatePatientProfile: (data) => api.put('/Patient/profile', data),
    getPatientAppointments: (patientId) => api.get(`/Patient/appointments${patientId ? `/${patientId}` : ''}`),
    getPatientMedicalHistory: () => api.get('/Patient/medical-history'),
    updateMedicalHistory: (data) => api.put('/Patient/medical-history', data),
    getPatientByUserId: (userId) => api.get(`/Patient/by-user/${userId}`)
};

// Payment API endpoints
const paymentService = {
    // Get payment URL for an appointment
    getPaymentUrl: async (appointmentId) => {
        try {
            return await api.post(`/Payment/pay-for-appointment/${appointmentId}`);
        } catch (error) {
            console.error('Payment URL generation error:', error);
            // If we get a 500 error, it might be a temporary backend issue
            if (error.response && error.response.status === 500) {
                // Wait a moment and try again (longer delay)
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    return await api.post(`/Payment/pay-for-appointment/${appointmentId}`);
                } catch (retryError) {
                    console.error('Payment URL generation retry failed:', retryError);
                    // Add more context to the error
                    if (retryError.response?.data) {
                        retryError.additionalInfo = 'Payment initialization failed after retry';
                    }
                    throw retryError;
                }
            }
            throw error;
        }
    },
    
    // Check payment status
    getPaymentStatus: async (appointmentId) => {
        try {
            return await api.get(`/Payment/payment-status/${appointmentId}`);
        } catch (error) {
            console.error('Payment status check error:', error);
            // If we get a 404 or 500, it might be because the payment record is still being created
            if (error.response && (error.response.status === 404 || error.response.status === 500)) {
                // Wait a moment and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    return await api.get(`/Payment/payment-status/${appointmentId}`);
                } catch (retryError) {
                    console.error('Payment status check retry failed:', retryError);
                    throw retryError;
                }
            }
            throw error;
        }
    },
    
    // Process payment webhook (for testing purposes)
    processWebhook: (data) => api.post('/WebHook/paymob', data),
    
    // Mock payment completion (for testing)
    mockPaymentComplete: (appointmentId) => api.post(`/Payment/mock-payment-complete/${appointmentId}`)
};

// Add email confirmation endpoints
export const confirmEmail = async (userId, token) => {
  try {
    const response = await api.get(`/Account/ConfirmEmail`, {
      params: { userId, token }
    });
    return response.data;
  } catch (error) {
    console.error('Email confirmation error:', error);
    throw error;
  }
};

export const resendConfirmationEmail = async (email) => {
  try {
    const response = await api.post(`/Account/ResendEmailConfirmation`, { email });
    return response.data;
  } catch (error) {
    console.error('Resend confirmation email error:', error);
    throw error;
  }
};

// Export all services as named exports
export {
    api as default,
    chatService,
    authService,
    doctorService,
    appointmentService,
    accountService,
    specializationService,
    ratingService,
    patientService,
    paymentService,
    gdprService,
    phoneVerificationService
};