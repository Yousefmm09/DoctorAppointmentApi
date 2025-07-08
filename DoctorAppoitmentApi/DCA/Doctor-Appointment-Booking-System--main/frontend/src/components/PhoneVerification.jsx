import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress, Stepper, Step, StepLabel } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config/environment';
import useNotification from '../hooks/useNotification';

const PhoneVerification = ({ userId, userType, currentPhone, onSuccess, onCancel }) => {
  const [step, setStep] = useState(0);
  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const steps = ['Enter new number', 'Verify code', 'Success'];

  const validatePhoneNumber = (phone) => {
    // Basic validation for international format with + and digits
    const phoneRegex = /^\+[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const handleRequestCode = async () => {
    // Validate phone format
    if (!validatePhoneNumber(newPhone)) {
      setError('Please enter a valid phone number in international format (e.g., +201234567890)');
      return;
    }

    // Don't allow same as current phone
    if (newPhone === currentPhone) {
      setError('New phone number must be different from your current number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/PhoneVerification/request-code`,
        {
          userId,
          userType,
          newPhoneNumber: newPhone
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('Verification code sent to your new number', 'success');
        setStep(1); // Move to verification step
      } else {
        setError(response.data.message || 'Failed to send verification code');
      }
    } catch (err) {
      console.error('Error requesting verification code:', err);
      setError(err.response?.data?.message || 'An error occurred while requesting the verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/PhoneVerification/verify-code`,
        {
          userId,
          userType,
          newPhoneNumber: newPhone,
          verificationCode
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('Phone number updated successfully', 'success');
        setStep(2); // Move to success step
        
        // Call the onSuccess callback with the new phone number
        if (onSuccess) {
          onSuccess(newPhone);
        }
      } else {
        setError(response.data.message || 'Failed to verify code');
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(err.response?.data?.message || 'An error occurred while verifying the code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Stepper activeStep={step} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Change Phone Number
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current phone: {currentPhone || 'Not set'}
          </Typography>
          <TextField
            label="New Phone Number"
            variant="outlined"
            fullWidth
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+201234567890"
            helperText="Enter your new phone number with country code (e.g., +201234567890)"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleRequestCode}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Send Verification Code'}
            </Button>
          </Box>
        </Box>
      )}

      {step === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Verify Your Phone Number
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We've sent a verification code to {newPhone}
          </Typography>
          <TextField
            label="Verification Code"
            variant="outlined"
            fullWidth
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="123456"
            helperText="Enter the 6-digit code sent to your new phone number"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => setStep(0)}
              disabled={loading}
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={handleVerifyCode}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify Code'}
            </Button>
          </Box>
        </Box>
      )}

      {step === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Phone Number Updated
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your phone number has been successfully updated to {newPhone}
          </Alert>
          <Button 
            variant="contained" 
            onClick={onCancel}
            fullWidth
          >
            Done
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default PhoneVerification; 