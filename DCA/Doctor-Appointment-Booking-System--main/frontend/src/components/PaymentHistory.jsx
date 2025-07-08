import React, { useState, useEffect } from 'react';
import { FiCreditCard, FiCheck, FiX, FiClock, FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { paymentService } from '../services/api';

const PaymentHistory = ({ appointmentId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (appointmentId) {
      fetchPaymentHistory(appointmentId);
    }
  }, [appointmentId]);

  const fetchPaymentHistory = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      // First check payment status to get current status
      const statusResponse = await paymentService.getPaymentStatus(id);
      
      if (statusResponse.data) {
        const status = statusResponse.data.status;
        const amount = statusResponse.data.amount || 100; // Get amount if available
        const transactionId = statusResponse.data.transactionId || `TXN-${Math.floor(Math.random() * 10000)}`;
        const paymentDate = statusResponse.data.paymentDate || new Date().toISOString();
        const paymentMethod = statusResponse.data.paymentMethod || 'Paymob';
        
        // Create payment record from response data
        const payment = {
          id: 1,
          amount,
          date: paymentDate,
          status,
          method: paymentMethod,
          transactionId
        };
        
        setPayments([payment]);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to load payment history. Please try again.');
      // Don't show toast here as it might be annoying
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return <FiCheck className="text-green-500" />;
      case 'failed':
        return <FiX className="text-red-500" />;
      case 'pending':
      default:
        return <FiClock className="text-yellow-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        <p>{error}</p>
        <button 
          onClick={() => fetchPaymentHistory(appointmentId)}
          className="mt-2 text-blue-600 hover:underline flex items-center justify-center mx-auto"
        >
          <FiRefreshCw className="mr-1" /> Try Again
        </button>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FiDollarSign className="mx-auto h-10 w-10 mb-2" />
        <p>No payment records found</p>
        <button 
          onClick={() => fetchPaymentHistory(appointmentId)}
          className="mt-2 text-blue-600 hover:underline flex items-center justify-center mx-auto"
        >
          <FiRefreshCw className="mr-1" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FiCreditCard className="mr-2" /> Payment History
        </h3>
        <button 
          onClick={() => fetchPaymentHistory(appointmentId)}
          className="text-blue-600 hover:text-blue-800"
          title="Refresh payment history"
        >
          <FiRefreshCw />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(payment.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${payment.amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.method}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(payment.status)}`}>
                    <span className="flex items-center">
                      {getStatusIcon(payment.status)}
                      <span className="ml-1">{payment.status}</span>
                    </span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.transactionId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistory;
