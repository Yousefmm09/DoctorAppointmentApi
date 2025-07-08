import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connectionTimeout = 15000; // 15 seconds timeout
    this.connectionPromise = null;
    this.isStarting = false;
    this.isStopping = false;
    this.activeGroups = new Set(); // Track which groups we've joined
    this.connectionFailed = false;
    this.lastErrorMessage = null;
    this.backendUrl = 'http://localhost:5109';
    this.pendingOperations = Promise.resolve(); // Track pending operations
  }

  // Check if token is valid
  checkTokenValidity(token) {
    if (!token) return false;
    
    try {
      // Simple check for JWT format (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Check if token is expired
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return true; // No expiration, assume valid
      
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      return expDate > now;
    } catch (e) {
      console.error('Error validating token:', e);
      return false;
    }
  }

  async startConnection(token) {
    // Prevent multiple simultaneous connection attempts
    if (this.isStarting) {
      console.log('SignalR connection attempt already in progress, returning existing promise');
      return this.connectionPromise || Promise.reject(new Error('Connection attempt in progress but no promise available'));
    }

    // If already connected, return immediately
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR already connected - reusing existing connection');
      return Promise.resolve();
    }

    // Validate token first
    if (!token || !this.checkTokenValidity(token)) {
      console.error('Invalid or expired token, aborting connection attempt');
      return Promise.reject(new Error('Invalid or expired authentication token'));
    }

    // Set flag to prevent multiple connection attempts
    this.isStarting = true;
    this.connectionFailed = false;

    // Create a new promise for the connection attempt
    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        // If there's a stop operation in progress, wait for it to complete
        if (this.isStopping) {
          console.log('Stop operation in progress, waiting before starting new connection');
          await new Promise(r => {
            const checkStopStatus = () => {
              if (!this.isStopping) {
                r();
              } else {
                setTimeout(checkStopStatus, 100);
              }
            };
            checkStopStatus();
          });
        }

        // If there's an existing connection in a non-connected state, stop it
        if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
          console.log('Stopping existing SignalR connection before creating new one');
          try {
            await this.stopConnection(true); // Internal stop
          } catch (error) {
            console.warn('Error stopping existing connection:', error);
            // Continue with new connection anyway
          }
        }

        console.log('Building new SignalR connection');
        // Build the connection with more robust options
        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(`${this.backendUrl}/chatHub`, { 
                accessTokenFactory: () => token,
                timeout: this.connectionTimeout,
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
          })
          .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 15000, 30000])
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Set up connection event handlers
        this.connection.onclose(async (error) => {
          console.log('SignalR connection closed');
          this.activeGroups.clear(); // Clear groups when connection closes
          
          // Only attempt to reconnect if it wasn't an intentional closure
          if (error && !this.isStopping) {
            console.log('SignalR connection closed with error:', error);
            this.lastErrorMessage = error.message || "Connection closed unexpectedly";
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
              
              // Wait before attempting to reconnect - increasing delay
              const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
              await new Promise(r => setTimeout(r, delay));
              
              // Try to reconnect
              try {
                this.isStarting = false; // Reset the flag
                await this.startConnection(token);
              } catch (reconnectError) {
                console.error('Failed to reconnect:', reconnectError);
              }
            } else {
              console.error('Max reconnection attempts reached');
              this.connectionFailed = true;
            }
          }
        });

        this.connection.onreconnecting((error) => {
          console.log('SignalR reconnecting:', error);
        });

        this.connection.onreconnected((connectionId) => {
          console.log('SignalR reconnected:', connectionId);
          this.reconnectAttempts = 0;
          this.connectionFailed = false;
          
          // Rejoin all active groups
          this.activeGroups.forEach(async (group) => {
            try {
              await this.joinGroup(group);
            } catch (error) {
              console.error(`Error rejoining group ${group} after reconnect:`, error);
            }
          });
        });

        // Create a timeout promise
        const timeoutPromise = new Promise((_, timeoutReject) => {
          setTimeout(() => timeoutReject(new Error(`Connection timeout after ${this.connectionTimeout}ms`)), 
            this.connectionTimeout);
        });

        try {
          // Use AbortController to be able to cancel the connection attempt
          const abortController = new AbortController();
          const connectionStartPromise = this.connection.start();

          // Add callbacks for SignalR methods before connection completes
          if (this.callbacks.receiveMessage) {
            this.connection.on('ReceiveMessage', this.callbacks.receiveMessage);
          }
          
          // Race the connection start against the timeout
          await Promise.race([
            connectionStartPromise,
            timeoutPromise
          ]);

          console.log('SignalR connected successfully');
          this.reconnectAttempts = 0;
          this.connectionFailed = false;
          
          resolve();
        } catch (startError) {
          // Handle specific connection failure errors
          console.error('Failed to start SignalR connection:', startError);
          
          this.lastErrorMessage = startError.message || "Connection failed";
          if (startError.message?.includes('negotiation')) {
            console.warn('Negotiation failed, server may be unavailable');
            
            // Try with alternative transport if negotiation failed
            try {
              console.log('Retrying with LongPolling transport');
              this.connection = new signalR.HubConnectionBuilder()
                .withUrl(`${this.backendUrl}/chatHub`, { 
                      accessTokenFactory: () => token,
                      timeout: this.connectionTimeout,
                      skipNegotiation: true,
                      transport: signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
                .configureLogging(signalR.LogLevel.Information)
                .build();
                
              await this.connection.start();
              console.log('SignalR connected successfully with LongPolling');
              this.reconnectAttempts = 0;
              this.connectionFailed = false;
              
              // Add callbacks for SignalR methods
              if (this.callbacks.receiveMessage) {
                this.connection.on('ReceiveMessage', this.callbacks.receiveMessage);
              }
              
              resolve();
              return;
            } catch (fallbackError) {
              console.error('Failed to connect with fallback transport:', fallbackError);
            }
          }
          
          this.connectionFailed = true;
          reject(startError);
        }
      } catch (error) {
        console.error('Error setting up SignalR connection:', error);
        // Clear the connection for a future retry
        this.connection = null;
        this.connectionFailed = true;
        this.lastErrorMessage = error.message || "Connection setup failed";
        reject(error);
      } finally {
        // Clear the connection flags
        this.isStarting = false;
      }
    });

    return this.connectionPromise;
  }

  async joinGroup(userId) {
    if (!this.connection) {
      throw new Error('SignalR connection not initialized');
    }

    // Skip if already in this group
    if (this.activeGroups.has(userId.toString())) {
      console.log(`Already in group for user ${userId}, skipping join`);
      return;
    }

    // Allow joining a group if the connection is in the Connected state
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      // Try to reconnect if not already connected
      console.log('Connection not in connected state, attempting to reconnect before joining group');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        await this.startConnection(token);
      } catch (error) {
        console.error('Failed to reconnect before joining group:', error);
        throw new Error('SignalR not connected and reconnection failed');
      }
    }

    try {
      const userIdString = userId.toString();
      await this.connection.invoke('JoinGroup', userIdString);
      console.log(`Joined group for user ${userId}`);
      this.activeGroups.add(userIdString); // Track that we've joined this group
    } catch (error) {
      console.error('Error joining SignalR group:', error);
      throw error;
    }
  }

  async leaveGroup(userId) {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn('Cannot leave group: connection not initialized or not connected');
      return;
    }

    try {
      const userIdString = userId.toString();
      await this.connection.invoke('LeaveGroup', userIdString);
      console.log(`Left group for user ${userId}`);
      this.activeGroups.delete(userIdString);
    } catch (error) {
      console.error('Error leaving SignalR group:', error);
    }
  }

  onReceiveMessage(callback) {
    this.callbacks.receiveMessage = callback;
    
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      this.connection.off('ReceiveMessage'); // Remove any existing handler
      this.connection.on('ReceiveMessage', callback);
    }

    return () => {
      if (this.connection?.state === signalR.HubConnectionState.Connected) {
        this.connection.off('ReceiveMessage', callback);
      }
      this.callbacks.receiveMessage = null;
    };
  }

  async stopConnection(isInternal = false) {
    if (this.isStopping) {
      console.log('SignalR disconnection already in progress');
      // Return a promise that resolves when the stopping is done
      return new Promise(resolve => {
        const checkStopStatus = () => {
          if (!this.isStopping) {
            resolve();
          } else {
            setTimeout(checkStopStatus, 100);
          }
        };
        checkStopStatus();
      });
    }

    this.isStopping = true;
    
    try {
      if (this.connection) {
        // Clear pending connection promise if stopping externally
        if (!isInternal) {
          this.connectionPromise = null;
        }
        
        // Leave all joined groups first
        for (const group of this.activeGroups) {
          try {
            if (this.connection.state === signalR.HubConnectionState.Connected) {
              await this.connection.invoke('LeaveGroup', group);
              console.log(`Left group ${group} during disconnection`);
            }
          } catch (groupError) {
            console.warn(`Error leaving group ${group} during disconnection:`, groupError);
          }
        }
        this.activeGroups.clear();
        
        // Check if connection is in a state that can be stopped
        if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
          // Then stop the connection
          await this.connection.stop();
          console.log('SignalR disconnected successfully');
        } else {
          console.log('Connection already disconnected');
        }
      }
    } catch (error) {
      console.error('Error stopping SignalR connection:', error);
      throw error;
    } finally {
      if (!isInternal) {
        this.connection = null;
      }
      this.isStopping = false;
    }
  }
  
  // Get connection status
  getConnectionStatus() {
    if (!this.connection) {
      return { connected: false, status: 'Disconnected', error: this.lastErrorMessage };
    }
    
    return {
      connected: this.connection.state === signalR.HubConnectionState.Connected,
      status: this.connection.state,
      failed: this.connectionFailed,
      error: this.lastErrorMessage
    };
  }
  
  // Reset connection state
  async resetConnection() {
    console.log('Resetting SignalR connection state');
    this.reconnectAttempts = 0;
    this.connectionFailed = false;
    this.lastErrorMessage = null;
    
    // Stop existing connection if any
    await this.stopConnection();
    
    // Clear groups
    this.activeGroups.clear();
    
    return true;
  }
}

// Create a singleton instance
const signalRService = new SignalRService();
export default signalRService; 