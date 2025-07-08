import React, { useContext, useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "./context/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { AdminContextProvider } from "./context/AdminContext";
import AppContextProvider from "./context/AppContext";
import PatientContextProvider from "./context/PatientContext";
import DoctorContextProvider from "./context/DoctorContext";
import { Link } from "react-router-dom";
import { Menu } from "@headlessui/react";
import ChatBot from "./components/ChatBot";
import PatientLayout from "./layouts/PatientLayout";
import PublicHome from "./pages/PublicHome";

// Public Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/Admin/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Layout from "./components/Layout";
import AllDoctors from "./pages/AllDoctors";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Patient Pages
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import MyProfile from "./pages/MyProfile";
import MyAppointments from "./pages/MyAppointments";
import Appointment from "./pages/Appointment";
import AppointmentDetails from "./pages/AppointmentDetails";
import GdprSettings from "./pages/GdprSettings";
import GdprRemovalConfirmation from "./pages/GdprRemovalConfirmation";
import PatientDoctorRatings from "./pages/PatientDoctorRatings";
import PatientChatPage from "./pages/patient/PatientChatPage";
import PatientContacts from "./pages/patient/PatientContacts";

// Admin Pages
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AllAppointments from "./pages/Admin/AllAppointments";
import DoctorsList from "./pages/Admin/DoctorsList";
import AddSpecialization from "./pages/Admin/AddSpecialization";

// Doctor Pages
import DoctorLayout from "./pages/doctor/DoctorLayout";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import DoctorLogin from "./pages/doctor/DoctorLogin";
import DoctorRatings from "./pages/doctor/DoctorRatings";
import DoctorChatPage from "./pages/doctor/DoctorChatPage";
import DoctorContacts from "./pages/doctor/DoctorContacts";

// Common Pages
import ChatPage from "./pages/ChatPage";
import ConversationsPage from "./pages/ConversationsPage";

// New Pages
import EmailConfirmation from './pages/EmailConfirmation';
import EmailConfirmed from './pages/EmailConfirmed';
import ResendConfirmation from './pages/ResendConfirmation';
import PaymentConfirmation from './pages/PaymentConfirmation';

// Route Configuration
const ROUTES = {
  PUBLIC: {
    LOGIN: '/login',
    REGISTER: '/register',
    ADMIN_LOGIN: '/admin/login',
    ABOUT: '/about',
    CONTACT: '/contact',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password'
  },
  PATIENT: {
    HOME: '/home',
    DOCTORS: '/doctors',
    DOCTORS_SPECIALTY: '/doctors/:speciality',
    PROFILE: '/my-profile',
    APPOINTMENTS: '/my-appointments',
    APPOINTMENT_DETAILS: '/appointment/details/:id',
    BOOK_APPOINTMENT: '/appointment/book/:docId',
    DOCTOR_RATINGS: '/my-doctor-ratings',
    CHAT: '/patient/chat/:recipientId',
    CONTACTS: '/patient/contacts',
    CONVERSATIONS: '/patient/messages'
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    APPOINTMENTS: '/admin/appointments',
    DOCTORS: '/admin/doctors',
    ADD_SPECIALIZATION: '/admin/add-specialization'
  },
  DOCTOR: {
    DASHBOARD: '/doctor/dashboard',
    APPOINTMENTS: '/doctor/appointments',
    AVAILABILITY: '/doctor/availability',
    PROFILE: '/doctor/profile',
    RATINGS: '/doctor/ratings',
    CHAT: '/doctor/chat/:recipientId',
    CONTACTS: '/doctor/contacts',
    CONVERSATIONS: '/doctor/messages'
  },
  COMMON: {
    GDPR_SETTINGS: '/gdpr-settings',
    GDPR_REMOVAL: '/gdpr-removal-confirmation'
  }
};

// Menu items for patient sidebar
const PATIENT_MENU_ITEMS = [
  { title: 'Home', path: '/home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { title: 'Find Doctors', path: '/doctors', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { title: 'My Appointments', path: '/my-appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { title: 'Doctor Ratings', path: '/my-doctor-ratings', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { title: 'My Profile', path: '/my-profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { title: 'Messages', path: '/patient/messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { title: 'Contacts', path: '/patient/contacts', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
];

// Menu items for doctor sidebar
const DOCTOR_MENU_ITEMS = [
  { title: 'Dashboard', path: '/doctor/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { title: 'Appointments', path: '/doctor/appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { title: 'Contacts', path: '/doctor/contacts', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { title: 'Availability', path: '/doctor/availability', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { title: 'My Ratings', path: '/doctor/ratings', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { title: 'My Profile', path: '/doctor/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { title: 'Messages', path: '/doctor/messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
];

// Function to determine redirect path based on user role
const getRedirectPath = (userRole) => {
  switch (userRole) {
    case 'Doctor':
      return ROUTES.DOCTOR.DASHBOARD;
    case 'Admin':
      return ROUTES.ADMIN.DASHBOARD;
    case 'Patient':
      return ROUTES.PATIENT.HOME;
    default:
      return ROUTES.PUBLIC.LOGIN;
  }
};

// Auth Guard Component
const AuthGuard = ({ children, allowedRoles }) => {
  const { token, userRole } = useContext(AppContext);
  const location = useLocation();

  // Check if the auth data exists in localStorage but not in context
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedToken && storedRole && !token) {
      // Force a page reload to ensure all contexts are properly initialized
      console.log("[AuthGuard] Auth data found in localStorage but not in context, reloading...");
      window.location.reload();
    }
  }, [token]);

  if (!token) {
    const targetPath = location.pathname.includes('/admin') 
      ? ROUTES.PUBLIC.ADMIN_LOGIN 
      : location.pathname.includes('/doctor')
        ? '/doctor/login'
      : ROUTES.PUBLIC.LOGIN;
    return <Navigate to={targetPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  return children;
};

const App = () => {
  const { token, userRole } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect logic
  useEffect(() => {
    if (token && userRole) {
      const currentPath = location.pathname;
      // Prevent redirecting away from the specific login pages themselves
      const isLoginPage = 
        currentPath === ROUTES.PUBLIC.LOGIN || 
        currentPath === ROUTES.PUBLIC.ADMIN_LOGIN || 
        currentPath === '/doctor/login'; // Add doctor login path if it exists
        
      const isPublicPath = Object.values(ROUTES.PUBLIC).includes(currentPath);
      const isCommonPath = Object.values(ROUTES.COMMON).includes(currentPath);
      
      // Redirect from general public pages (but not login pages) if logged in
      if ((isPublicPath && !isLoginPage && !isCommonPath) || currentPath === '/') {
        const redirectPath = getRedirectPath(userRole);
        console.log(`[App] Redirecting logged-in ${userRole} from public path ${currentPath} to ${redirectPath}`);
        navigate(redirectPath, { replace: true });
      }
    }
  }, [token, userRole, location.pathname, navigate]);

  return (
    <>
      <Routes>
        {/* Public Routes - No layout needed */}
        <Route path={ROUTES.PUBLIC.LOGIN} element={<Login />} />
        <Route path={ROUTES.PUBLIC.REGISTER} element={<Register />} />
        <Route path={ROUTES.PUBLIC.ADMIN_LOGIN} element={<AdminLogin />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path={ROUTES.PUBLIC.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.PUBLIC.RESET_PASSWORD} element={<ResetPassword />} />

        {/* Root path always shows PublicHome */}
        <Route path="/" element={<PublicHome />} />

        {/* Public Routes with Layout - for non-authenticated users */}
        <Route element={<Layout showSidebar={false} />}>
          <Route path={ROUTES.PUBLIC.ABOUT} element={<About />} /> 
          <Route path={ROUTES.PUBLIC.CONTACT} element={<Contact />} />
          {/* Public doctors listing that doesn't require authentication */}
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/all-doctors" element={<AllDoctors />} />
        </Route>

        {/* Appointment pages */}
        <Route element={<Layout showSidebar={true} menuItems={PATIENT_MENU_ITEMS} />}>
          <Route path="/appointment/book/:docId" element={<Appointment />} />
          <Route path="/appointment/:id" element={<AppointmentDetails />} />
        </Route>

        {/* Patient Routes - Wrapped in Layout with Sidebar */}
        <Route element={<ProtectedRoute allowedRoles={['Patient']} />}>
          <Route element={<PatientLayout />}>
            <Route path={ROUTES.PATIENT.HOME} element={<Home />} />
            {/* Remove or comment out the protected doctors route since we have a public one */}
            {/* <Route path={ROUTES.PATIENT.DOCTORS} element={<Doctors />} /> */}
            <Route path={ROUTES.PATIENT.DOCTORS_SPECIALTY} element={<Doctors />} />
            <Route path={ROUTES.PATIENT.PROFILE} element={<MyProfile />} />
            <Route path={ROUTES.PATIENT.APPOINTMENTS} element={<MyAppointments />} />
            <Route path={ROUTES.PATIENT.APPOINTMENT_DETAILS} element={<AppointmentDetails />} />
            <Route path={ROUTES.PATIENT.DOCTOR_RATINGS} element={<PatientDoctorRatings />} />
            <Route path={ROUTES.PATIENT.CHAT} element={<PatientChatPage />} />
            <Route path={ROUTES.PATIENT.CONTACTS} element={<PatientContacts />} />
            <Route path={ROUTES.PATIENT.CONVERSATIONS} element={<ConversationsPage />} />
            {/* Add About and Contact inside the protected layout as well */}
            <Route path="/patient/about" element={<About />} />
            <Route path="/patient/contact" element={<Contact />} />
          </Route>
        </Route>

        {/* Admin Routes - Wrapped in AdminLayout */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route element={<AdminLayout />}> {/* Use AdminLayout here */} 
            <Route path={ROUTES.ADMIN.DASHBOARD} element={<AdminDashboard />} />
            <Route path={ROUTES.ADMIN.APPOINTMENTS} element={<AllAppointments />} />
            <Route path={ROUTES.ADMIN.DOCTORS} element={<DoctorsList />} />
            <Route path={ROUTES.ADMIN.ADD_SPECIALIZATION} element={<AddSpecialization />} />
          </Route>
        </Route>

        {/* Doctor Routes - Wrapped in DoctorLayout */}
        <Route element={<ProtectedRoute allowedRoles={['Doctor']} />}>
          <Route element={<DoctorLayout menuItems={DOCTOR_MENU_ITEMS} />}> {/* Pass menu items to DoctorLayout */}
            <Route path={ROUTES.DOCTOR.DASHBOARD} element={<DoctorDashboard />} />
            <Route path={ROUTES.DOCTOR.APPOINTMENTS} element={<DoctorAppointments />} />
            <Route path={ROUTES.DOCTOR.AVAILABILITY} element={<DoctorAvailability />} />
            <Route path={ROUTES.DOCTOR.PROFILE} element={<DoctorProfile />} />
            <Route path={ROUTES.DOCTOR.RATINGS} element={<DoctorRatings />} />
            <Route path={ROUTES.DOCTOR.CHAT} element={<DoctorChatPage />} />
            <Route path={ROUTES.DOCTOR.CONTACTS} element={<DoctorContacts />} />
            <Route path={ROUTES.DOCTOR.CONVERSATIONS} element={<ConversationsPage />} />
          </Route>
        </Route>

        {/* Common Routes - May or may not need a layout */}
        <Route path={ROUTES.COMMON.GDPR_SETTINGS} element={<GdprSettings />} />
        <Route path={ROUTES.COMMON.GDPR_REMOVAL} element={<GdprRemovalConfirmation />} />

        {/* Public Home Page */}
        <Route path="/public/home" element={<PublicHome />} />

        {/* New Routes */}
        <Route path="/confirm-email" element={<EmailConfirmation />} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />
        <Route path="/resend-confirmation" element={<ResendConfirmation />} />
        <Route path="/payment-confirmation" element={<PaymentConfirmation />} />

        {/* Default Route (catch-all) */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-red-500">Page Not Found</h1>
                <p className="mt-2 text-lg text-gray-600">The page you are looking for doesn't exist or has been moved.</p>
                <button 
                  onClick={() => navigate(token && userRole ? getRedirectPath(userRole) : ROUTES.PUBLIC.LOGIN)}
                  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go to Home
                </button>
              </div>
            </div>
          }
        />
      </Routes>
      
      {/* Add ChatBot component - only show for authenticated users */}
      {token && <ChatBot />}
    </>
  );
};

const AppWithProviders = () => (
  <AppContextProvider>
    <PatientContextProvider>
      <DoctorContextProvider>
        <AdminContextProvider>
          <App />
        </AdminContextProvider>
      </DoctorContextProvider>
    </PatientContextProvider>
  </AppContextProvider>
);

export default AppWithProviders;
