import React, { useEffect, useState, useContext, useRef } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { 
  FaUserMd, 
  FaCalendarCheck, 
  FaUserInjured, 
  FaHospital, 
  FaSync, 
  FaChartLine,
  FaCalendarAlt,
  FaStar,
  FaUser,
  FaExclamationTriangle
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getProfileImageUrl } from '../../utils/imageHelper';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

const AdminDashboard = () => {
  const { getDashData, isAuthenticated, aToken, backendUrl, authChecked } = useContext(AdminContext);
  const [dashboardData, setDashboardData] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalClinics: 0,
    recentAppointments: [],
    topDoctors: [],
    averageFee: 0
  });
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataFetched = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip effect if already mounted
    if (mountedRef.current) return;
    
    // Set mounted flag
    mountedRef.current = true;
    
    // Log only once when component mounts
    console.log('AdminDashboard mounted, isAuthenticated:', isAuthenticated);
    console.log('aToken exists:', !!aToken);
    console.log('backendUrl:', backendUrl);
    
    // Skip data fetching if authentication isn't complete yet
    if (!authChecked) {
      console.log('Authentication check not complete, waiting...');
      return;
    }
    
    const fetchDashboardData = async () => {
      // Skip if data already fetched
      if (dataFetched.current) {
        console.log('Data already fetched, skipping');
        return;
      }
      
      // Only fetch if authenticated
      if (!isAuthenticated || !aToken) {
        console.log('Not authenticated, skipping data fetch');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching dashboard data...');
        
        if (!getDashData) {
          console.error('getDashData function is not available');
          setError('Dashboard data function not available');
          setLoading(false);
          return;
        }
        
        const data = await getDashData();
        console.log('Dashboard data received:', data ? 'success' : 'empty');
        
        // Fetch specializations
        try {
          const response = await fetch(`${backendUrl}/api/Specializations/AllSpecializations`, {
            headers: {
              'Authorization': `Bearer ${aToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch specializations: ${response.status}`);
          }
          
          const specializationsData = await response.json();
          console.log('Specializations data received:', specializationsData);
          
          if (mountedRef.current && specializationsData) {
            // Transform specialization data for the pie chart
            const formattedSpecializations = specializationsData.map(spec => ({
              name: spec.name || 'Unknown',
              value: spec.doctorCount || 1
            }));
            setSpecializations(formattedSpecializations);
          }
        } catch (specErr) {
          console.error('Error fetching specializations:', specErr);
        }
        
        // Only update state if component is still mounted
        if (mountedRef.current) {
          if (data) {
            // Ensure data has the expected structure and handle case-insensitive property names
            const formattedData = {
              totalDoctors: data.totalDoctors || data.totaldoctors || 0,
              totalPatients: data.totalPatients || data.totalpatients || 0,
              totalAppointments: data.totalAppointments || data.totalappointments || 0,
              totalClinics: data.totalClinics || data.totalclinics || 0,
              recentAppointments: data.recentAppointments || 
                (data.latestAppointment || data.latestappointment ? [data.latestAppointment || data.latestappointment] : []),
              topDoctors: data.topDoctors || data.topdoctors || [],
              averageFee: data.averageFee || 0
            };
            console.log('Formatted dashboard data:', formattedData);
            setDashboardData(formattedData);
            dataFetched.current = true;
          } else {
            console.error('No data returned from getDashData');
            setError('No dashboard data available');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (mountedRef.current) {
          setError(`Failed to load dashboard data: ${err.message || 'Unknown error'}`);
          setLoading(false);
        }
      }
    };

    // Fetch data with a slight delay to avoid race conditions
    const timeoutId = setTimeout(() => {
      if (isAuthenticated && aToken) {
        fetchDashboardData();
      } else {
        console.log('Not authenticated, skipping data fetch');
        setLoading(false);
      }
    }, 500);
    
    // Clean up function
    return () => {
      console.log('AdminDashboard unmounting');
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, aToken, authChecked, getDashData, backendUrl]);

  // Manual refresh function
  const handleRefresh = async () => {
    if (!isAuthenticated || !aToken) {
      console.log('Not authenticated, cannot refresh');
      return;
    }
    
    dataFetched.current = false;
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDashData();
      
      // Also refresh specializations
      try {
        const response = await fetch(`${backendUrl}/api/Specializations/AllSpecializations`, {
          headers: {
            'Authorization': `Bearer ${aToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch specializations: ${response.status}`);
        }
        
        const specializationsData = await response.json();
        
        if (mountedRef.current && specializationsData) {
          // Transform specialization data for the pie chart
          const formattedSpecializations = specializationsData.map(spec => ({
            name: spec.name || 'Unknown',
            value: spec.doctorCount || 1
          }));
          setSpecializations(formattedSpecializations);
        }
      } catch (specErr) {
        console.error('Error refreshing specializations:', specErr);
      }
      
      if (mountedRef.current) {
        if (data) {
          // Ensure data has the expected structure and handle case-insensitive property names
          const formattedData = {
            totalDoctors: data.totalDoctors || data.totaldoctors || 0,
            totalPatients: data.totalPatients || data.totalpatients || 0,
            totalAppointments: data.totalAppointments || data.totalappointments || 0,
            totalClinics: data.totalClinics || data.totalclinics || 0,
            recentAppointments: data.recentAppointments || 
              (data.latestAppointment || data.latestappointment ? [data.latestAppointment || data.latestappointment] : []),
            topDoctors: data.topDoctors || data.topdoctors || [],
            averageFee: data.averageFee || 0
          };
          setDashboardData(formattedData);
        } else {
          setError('No dashboard data available');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      if (mountedRef.current) {
        setError('Failed to refresh dashboard data');
        setLoading(false);
      }
    }
  };

  // Use real specialization data or fallback to mock data if empty
  const getSpecialtyData = () => {
    if (specializations && specializations.length > 0) {
      return specializations;
    }
    
    // Fallback mock data if no real data is available
    return [
      { name: 'Cardiology', value: 25 },
      { name: 'Neurology', value: 15 },
      { name: 'Pediatrics', value: 20 },
      { name: 'Orthopedics', value: 18 },
      { name: 'Dermatology', value: 12 }
    ];
  };

  const getAppointmentData = () => {
    // This is a mock function for appointment trends
    return [
      { name: 'Jan', appointments: 65 },
      { name: 'Feb', appointments: 59 },
      { name: 'Mar', appointments: 80 },
      { name: 'Apr', appointments: 81 },
      { name: 'May', appointments: 90 },
      { name: 'Jun', appointments: 125 }
    ];
  };

  // If still checking authentication, show loading
  if (!authChecked) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg shadow-sm" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="h-5 w-5 mr-3 text-yellow-600" />
            <h3 className="font-bold">Authentication Required</h3>
          </div>
          <p className="mt-1">Please log in as an admin to view the dashboard.</p>
        </div>
      </div>
    );
  }

  // Show loading indicator
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg shadow-sm" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="h-5 w-5 mr-3 text-red-600" />
            <h3 className="font-bold">Error</h3>
          </div>
          <p className="mt-1">{error}</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <FaSync className="mr-2" /> Retry
        </button>
      </div>
    );
  }

  const StatCard = ({ icon, title, value, color, bgColor, iconBg }) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full -mr-16 -mt-16 opacity-70"></div>
      <div className="p-6 relative z-10">
        <div className={`${iconBg || 'bg-gradient-to-r from-blue-500 to-blue-600'} w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-md`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        <p className={`text-2xl font-bold ${color || 'text-gray-800'}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div className="flex flex-col gap-1 text-white">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <FaChartLine className="text-white/80" />
              Dashboard Overview
            </h1>
            <p className="text-blue-100">
              Welcome to the admin dashboard. Manage and monitor all system activities.
            </p>
          </div>
          
          <button 
            onClick={handleRefresh}
            className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
          >
            <FaSync className="w-4 h-4" /> Refresh Data
          </button>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl -z-0 transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute left-0 bottom-0 w-40 h-40 bg-blue-400 rounded-full opacity-10 blur-2xl -z-0 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>
        
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<FaUserMd className="h-6 w-6 text-blue-500" />} 
          title="Total Doctors" 
          value={dashboardData.totalDoctors} 
          color="border-blue-500"
          iconBg="bg-blue-100"
        />
        <StatCard 
          icon={<FaUserInjured className="h-6 w-6 text-green-500" />} 
          title="Total Patients" 
          value={dashboardData.totalPatients} 
          color="border-green-500"
          iconBg="bg-green-100"
        />
        <StatCard 
          icon={<FaCalendarCheck className="h-6 w-6 text-purple-500" />} 
          title="Total Appointments" 
          value={dashboardData.totalAppointments} 
          color="border-purple-500"
          iconBg="bg-purple-100"
        />
        <StatCard 
          icon={<FaHospital className="h-6 w-6 text-yellow-500" />} 
          title="Average Fee" 
          value={`$${parseFloat(dashboardData.averageFee || 0).toFixed(2)}`} 
          color="border-yellow-500"
          iconBg="bg-yellow-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <FaCalendarAlt className="text-blue-600" />
            </div>
            Appointment Trends
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getAppointmentData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
                  itemStyle={{ color: '#374151' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                  cursor={{fill: 'rgba(0, 0, 0, 0.05)'}}
                />
                <Bar dataKey="appointments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <FaUserMd className="text-blue-600" />
            </div>
            Specialization Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getSpecialtyData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {getSpecialtyData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Tooltip 
                  formatter={(value, name) => [`${value} doctors`, name]} 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Appointments */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <FaCalendarCheck className="text-blue-600" />
            </div>
            Recent Appointments
          </h2>
          {dashboardData.recentAppointments && dashboardData.recentAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboardData.recentAppointments.map((appointment, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                            <FaUser className="h-4 w-4" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{appointment.patientName || 'Unknown Patient'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.doctorName || 'Unknown Doctor'}</div>
                        <div className="text-xs text-gray-500">{appointment.specialization || 'Unknown'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {appointment.appointmentDate
                            ? new Date(appointment.appointmentDate).toLocaleDateString()
                            : 'Unknown Date'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {appointment.startTime || 'Unknown Time'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.status === 'Completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                          appointment.status === 'Cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {appointment.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-center">No recent appointments available</p>
            </div>
          )}
        </div>

        {/* Top Doctors */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg mr-3">
              <FaStar className="text-white" />
            </div>
            Top Doctors
          </h2>
          {dashboardData.topDoctors && dashboardData.topDoctors.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.topDoctors.map((doctor, index) => (
                <div key={index} className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-4 overflow-hidden border-2 border-blue-200 shadow-sm">
                    {doctor.profilePicture || doctor.imageUrl ? (
                      <img 
                        src={getProfileImageUrl(doctor.profilePicture || doctor.imageUrl, 'doctor', doctor.id)} 
                        alt={doctor.name} 
                        className="h-full w-full object-cover" 
                        onError={(e) => { 
                          e.target.onerror = null; 
                          e.target.src = "/assets/placeholder-doctor.png";
                          // If the placeholder doesn't exist, use a data URI
                          e.target.onerror = () => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=0D8ABC&color=fff&size=256`;
                          };
                        }}
                      />
                    ) : (
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=0D8ABC&color=fff&size=256`}
                        alt={doctor.name} 
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-md font-semibold text-gray-900">{doctor.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{doctor.specialization}</p>
                      <span className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2.5 py-1 rounded-full">
                        {doctor.appointmentCount} appointments
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center bg-yellow-50 px-2.5 py-1.5 rounded-lg shadow-sm border border-yellow-100">
                    <FaStar className="text-yellow-400 mr-1.5" />
                    <span className="font-medium text-yellow-700">{parseFloat(doctor.rating || 0).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500 text-center">No top doctors data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;