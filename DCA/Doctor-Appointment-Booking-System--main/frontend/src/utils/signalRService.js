import * as signalR from '@microsoft/signalr';

// SignalR service for real-time communication
class SignalRService {
  constructor() {
    this.connection = null;
    this.connectionPromise = null;
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
    this.hubUrl = `${this.backendUrl}/chathub`; // Updated to match the hub path in Program.cs
    this.listeners = {};
  }

  // Initialize the connection
  async start(token) {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR connection already established');
      return this.connection;
    }

    // Create a new connection if one doesn't exist
    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry pattern in milliseconds
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up connection event handlers
      this.connection.onreconnecting((error) => {
        console.log('SignalR reconnecting:', error);
      });

      this.connection.onreconnected((connectionId) => {
        console.log('SignalR reconnected with ID:', connectionId);
      });

      this.connection.onclose((error) => {
        console.log('SignalR connection closed:', error);
      });
    }

    // Start the connection
    if (!this.connectionPromise) {
      this.connectionPromise = this.connection.start()
        .then(() => {
          console.log('SignalR connected successfully');
          return this.connection;
        })
        .catch(error => {
          console.error('SignalR connection error:', error);
          this.connectionPromise = null;
          throw error;
        });
    }

    return this.connectionPromise;
  }

  // Stop the connection
  async stop() {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('SignalR connection stopped');
      } catch (error) {
        console.error('SignalR stop error:', error);
      } finally {
        this.connection = null;
        this.connectionPromise = null;
      }
    }
  }

  // Register event handlers
  on(eventName, callback) {
    if (!this.connection) {
      console.error('Cannot register event handler: SignalR connection not initialized');
      return;
    }

    // Save the listener for later management
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);

    // Register with SignalR
    this.connection.on(eventName, callback);
  }

  // Remove specific event handler
  off(eventName, callback) {
    if (!this.connection) return;

    if (callback && this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
      this.connection.off(eventName, callback);
    } else if (!callback) {
      // Remove all handlers for this event
      if (this.listeners[eventName]) {
        delete this.listeners[eventName];
      }
      this.connection.off(eventName);
    }
  }

  // Call hub method
  async invoke(methodName, ...args) {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('Cannot invoke method: SignalR connection not active');
      throw new Error('SignalR connection not active');
    }

    try {
      return await this.connection.invoke(methodName, ...args);
    } catch (error) {
      console.error(`Error invoking hub method ${methodName}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const signalRService = new SignalRService();
export default signalRService; 