import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { videoCallService } from '../services/videoCallService';
import { toast } from 'react-toastify';

const VideoCall = ({ appointmentId, onEnd }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callTimerRef = useRef(null);

  useEffect(() => {
    initializeCall();
    startCallTimer();

    return () => {
      cleanup();
    };
  }, []);

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const initializeCall = async () => {
    try {
      // Check permissions first
      const { hasPermissions, error: permissionError } = await videoCallService.checkPermissions();
      if (!hasPermissions) {
        throw new Error('Camera and microphone permissions are required');
      }

      // Initialize call session
      const { data: session } = await videoCallService.initializeCall(appointmentId);

      // Get ICE servers configuration
      const { data: iceConfig } = await videoCallService.getIceServers();

      // Initialize WebRTC peer connection
      const { peerConnection, localStream } = await videoCallService.initializePeerConnection(iceConfig);
      peerConnectionRef.current = peerConnection;
      setLocalStream(localStream);

      // Set up event handlers
      setupPeerConnectionHandlers(peerConnection);

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Create and send offer
      const offer = await videoCallService.createOffer(peerConnection);
      await videoCallService.sendSignal(session.id, { type: 'offer', offer });

      setIsConnecting(false);
    } catch (err) {
      console.error('Error initializing call:', err);
      setError(err.message);
      toast.error('Failed to initialize video call');
    }
  };

  const setupPeerConnectionHandlers = (peerConnection) => {
    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      switch (peerConnection.connectionState) {
        case 'connected':
          setIsConnecting(false);
          break;
        case 'disconnected':
        case 'failed':
          toast.error('Call connection lost');
          handleEndCall();
          break;
        default:
          break;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        videoCallService.sendSignal(appointmentId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      remoteVideoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = async () => {
    try {
      await videoCallService.endCall(appointmentId);
      cleanup();
      onEnd();
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Error ending call');
    }
  };

  const cleanup = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    if (peerConnectionRef.current && localStream) {
      videoCallService.cleanup(peerConnectionRef.current, localStream);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="text-lg font-medium mb-2">Error</p>
        <p className="text-center">{error}</p>
        <button
          onClick={onEnd}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Remote Video (Full Screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {/* Call Duration */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
        {formatDuration(callDuration)}
      </div>

      {/* Loading Overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p>Connecting...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} text-white hover:opacity-90`}
          >
            {isMuted ? <FiMicOff size={24} /> : <FiMic size={24} />}
          </button>
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <FiPhoneOff size={24} />
          </button>
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${!isVideoEnabled ? 'bg-red-600' : 'bg-gray-600'} text-white hover:opacity-90`}
          >
            {isVideoEnabled ? <FiVideo size={24} /> : <FiVideoOff size={24} />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-4 rounded-full bg-gray-600 text-white hover:opacity-90"
          >
            {isFullscreen ? <FiMinimize2 size={24} /> : <FiMaximize2 size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall; 