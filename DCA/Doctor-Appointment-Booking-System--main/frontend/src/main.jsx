import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/ToastNotifications'

// Add error tracking
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We're sorry, but an error has occurred. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Set document title from environment variables
document.title = import.meta.env.VITE_APP_TITLE || "Tabebek - Medical Appointment System";

// Always use light mode
const disableDarkMode = () => {
  try {
    // Remove dark mode class and set localStorage
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'false');
    console.log('Dark mode disabled');
  } catch (error) {
    console.error('Failed to disable dark mode:', error);
  }
};

// Run the dark mode disabling
disableDarkMode();

// Console notice for development environment
if (import.meta.env.DEV) {
  console.log(`Running in ${import.meta.env.MODE} mode`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
        <App />
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
