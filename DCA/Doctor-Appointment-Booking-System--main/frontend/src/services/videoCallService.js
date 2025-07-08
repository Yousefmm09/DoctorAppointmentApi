import { apiClient } from './api';

export const videoCallService = {
  // Initialize a new video call session
  initializeCall: (appointmentId) =>
    apiClient.post(`/api/VideoCall/initialize/${appointmentId}`),

  // Get call details including WebRTC configuration
  getCallDetails: (callId) =>
    apiClient.get(`/api/VideoCall/${callId}`),

  // Update call status
  updateCallStatus: (callId, status) =>
    apiClient.put(`/api/VideoCall/${callId}/status`, { status }),

  // Store WebRTC signaling data
  sendSignal: (callId, signal) =>
    apiClient.post(`/api/VideoCall/${callId}/signal`, signal),

  // Get WebRTC ICE servers configuration
  getIceServers: () =>
    apiClient.get('/api/VideoCall/ice-servers'),

  // End the call
  endCall: (callId) =>
    apiClient.post(`/api/VideoCall/${callId}/end`),

  // Get call history
  getCallHistory: () =>
    apiClient.get('/api/VideoCall/history'),

  // Report call quality metrics
  reportCallMetrics: (callId, metrics) =>
    apiClient.post(`/api/VideoCall/${callId}/metrics`, metrics),

  // Check if user has required permissions for video call
  checkPermissions: () =>
    new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        stream.getTracks().forEach(track => track.stop());
        resolve({ hasPermissions: true });
      } catch (error) {
        resolve({ hasPermissions: false, error });
      }
    }),

  // Initialize WebRTC peer connection
  initializePeerConnection: async (configuration) => {
    const pc = new RTCPeerConnection(configuration);
    
    // Get local media stream
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    
    return { peerConnection: pc, localStream: stream };
  },

  // Create WebRTC offer
  createOffer: async (peerConnection) => {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await peerConnection.setLocalDescription(offer);
    return offer;
  },

  // Handle WebRTC answer
  handleAnswer: async (peerConnection, answer) => {
    const remoteDesc = new RTCSessionDescription(answer);
    await peerConnection.setRemoteDescription(remoteDesc);
  },

  // Add ICE candidate
  addIceCandidate: async (peerConnection, candidate) => {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  },

  // Clean up WebRTC resources
  cleanup: (peerConnection, localStream) => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
  }
}; 