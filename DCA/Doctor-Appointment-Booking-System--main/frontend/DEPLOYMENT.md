# Frontend Deployment Guide

This document provides instructions for deploying the Doctor Appointment System frontend application to various environments.

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Access to the deployment environment

## Building for Production

### 1. Using the Build Scripts

For Unix/Linux/macOS:
```bash
# Make the script executable
chmod +x build-production.sh

# Run the build script
./build-production.sh
```

For Windows:
```cmd
build-production.bat
```

### 2. Manual Build Process

If you prefer to run the commands manually:

```bash
# Install dependencies
npm ci

# Lint the code
npm run lint

# Build for production
npm run build
```

The production build will be created in the `dist/` directory.

## Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the project root with the following variables:

```
VITE_APP_ENV=production
```

Additional environment variables can be added as needed.

## Deployment Options

### 1. Static Hosting (Recommended)

The application can be deployed to any static hosting service:

- **Netlify**: Connect your repository and set the build command to `npm run build` and the publish directory to `dist`.
- **Vercel**: Similar to Netlify, connect your repository and Vercel will automatically detect the build settings.
- **GitHub Pages**: Run the build process and deploy the `dist/` directory.
- **Azure Static Web Apps**: Connect your repository and configure the build process.

### 2. Server Deployment

To deploy on a traditional web server:

1. Build the application using the instructions above.
2. Copy the contents of the `dist/` directory to your web server's public directory.
3. Configure your web server to serve the `index.html` file for all routes.

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. Backend Integration

To deploy with the .NET backend:

1. Build the frontend application.
2. Copy the contents of the `dist/` directory to the `wwwroot/frontend` directory in your .NET project.
3. Configure the backend to serve the frontend files.

## Post-Deployment Verification

After deployment, verify that:

1. The application loads correctly
2. Authentication works
3. API requests are successful
4. All features are working as expected

## Troubleshooting

Common issues and solutions:

- **Blank Page**: Check browser console for errors. May be related to incorrect base URL or routing issues.
- **API Connection Errors**: Verify that the environment variables are correctly set.
- **Missing Assets**: Ensure all files were correctly copied to the deployment location.

## Rollback Procedure

To rollback to a previous version:

1. Identify the previous working build
2. Replace the current deployment with the previous build
3. Verify the application is working correctly 