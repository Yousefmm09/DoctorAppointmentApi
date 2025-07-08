# Deployment Guide for Doctor Appointment System

This document provides instructions for deploying the Doctor Appointment System to a production environment.

## Backend Deployment

### Prerequisites
- .NET 6 SDK or higher
- SQL Server instance
- SMTP server or email service provider account
- SSL certificate for HTTPS

### Steps

1. **Prepare the Production Configuration**
   
   Update `appsettings.Production.json` with production-specific settings:
   
   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Warning",
         "Microsoft.AspNetCore": "Warning"
       }
     },
     "JWT": {
       "ValidIssuer": "https://your-domain.com/",
       "ValidAudience": "https://your-domain.com",
       "Secret": "YourStrongProductionSecret_AtLeast32Characters"
     },
     "ConnectionStrings": {
       "DefaultConnection": "Server=production-server;Database=DoctorAppointmentDb;User Id=username;Password=password;TrustServerCertificate=True;"
     },
     "EmailSettings": {
       "SmtpServer": "smtp.provider.com",
       "SmtpPort": 587,
       "SmtpUsername": "your-email@provider.com",
       "SmtpPassword": "your-secure-password",
       "SenderEmail": "appointments@your-domain.com",
       "SenderName": "Doctor Appointment System"
     },
     "CORS": {
       "AllowedOrigins": ["https://your-domain.com"]
     }
   }
   ```

2. **Build the Application**
   
   ```bash
   cd DoctorAppoitmentApi
   dotnet publish -c Release -o ./published
   ```

3. **Deploy to IIS or Other Hosting Environment**
   
   - **For IIS:**
     - Install the .NET Hosting Bundle on the server
     - Create a new website in IIS
     - Point it to the `published` directory
     - Configure the application pool to use No Managed Code
     - Enable HTTPS with your SSL certificate

   - **For Azure App Service:**
     ```bash
     dotnet publish -c Release
     cd bin/Release/net6.0/publish
     zip -r publish.zip .
     az webapp deployment source config-zip --resource-group <resource-group> --name <app-name> --src publish.zip
     ```

4. **Set Environment Variables**
   
   Set the environment variable `ASPNETCORE_ENVIRONMENT` to `Production`

5. **Apply Database Migrations**
   
   ```bash
   cd DoctorAppoitmentApi
   dotnet ef database update --connection "Server=production-server;Database=DoctorAppointmentDb;User Id=username;Password=password;TrustServerCertificate=True;"
   ```

6. **Verify Backend Deployment**
   
   Access `https://your-domain.com/swagger` to verify the API documentation is accessible.

## Frontend Deployment

### Prerequisites
- Node.js 16.x or higher
- npm or yarn
- Web server (Nginx, Apache) or hosting platform (Netlify, Vercel)

### Steps

1. **Prepare the Production Configuration**

   Create a `.env.production` file:
   ```
   VITE_API_URL=https://api.your-domain.com
   VITE_CHAT_HUB_URL=https://api.your-domain.com/chathub
   ```

2. **Build the Frontend**

   ```bash
   cd DCA/Doctor-Appointment-Booking-System--main/frontend
   npm install
   npm run build
   ```

   This will generate a `dist` directory with the built application.

3. **Deploy the Frontend**

   - **For Nginx:**
   
     Create a new site configuration:
     
     ```nginx
     server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$host$request_uri;
     }

     server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       root /path/to/dist;
       index index.html;
       
       location / {
         try_files $uri $uri/ /index.html;
       }
     }
     ```

   - **For Vercel or Netlify:**
     
     Follow the platform-specific deployment instructions, pointing to the frontend directory.

4. **Verify Frontend Deployment**

   Access `https://your-domain.com` and ensure you can log in and access the features.

## Security Considerations

1. **Secure JWT Secret**
   - Use a strong, unique secret for JWT token signing
   - Consider using Azure Key Vault or AWS Secrets Manager for managing secrets

2. **HTTPS Only**
   - Configure HSTS (HTTP Strict Transport Security)
   - Set the Secure flag on cookies

3. **API Security**
   - Configure proper CORS settings to restrict access to known origins
   - Consider rate limiting for API endpoints
   - Use appropriate authorization policies for each endpoint

4. **Database Security**
   - Use a service account with minimal required permissions
   - Enable TLS encryption for database connection
   - Regularly backup your database

5. **Monitoring and Logging**
   - Set up application monitoring (e.g., Application Insights)
   - Configure centralized logging
   - Set up alerts for critical errors

## Maintenance Tasks

1. **Database Backups**
   - Configure regular automated backups
   - Test restoration procedures periodically

2. **Updates**
   - Regularly update NuGet/npm packages to address security vulnerabilities
   - Plan for and test database migration updates

3. **Performance Monitoring**
   - Monitor API response times
   - Track resource usage (CPU, memory, disk)
   - Optimize database queries as needed

4. **Scaling**
   - For higher loads, consider scaling options:
     - Vertical scaling (increase resources)
     - Horizontal scaling (load balancing)
     - Database scaling strategies 