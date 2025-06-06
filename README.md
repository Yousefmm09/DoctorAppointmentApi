# DoctorAppointment API

## Project Overview
DoctorAppointment is a comprehensive backend system for managing appointments between doctors and patients. The system allows patients to easily book and manage their appointments, while doctors can track their schedules, patient information, and earnings. An admin role is also included for managing users, appointments, and system settings securely.

---

## Key Features
- User roles: Patient, Doctor, and Admin with role-based access control.
- Patient appointment booking and management.
- Doctor dashboard for monitoring appointments and revenue.
- Secure user authentication and authorization using JWT.
- File upload support (e.g., profile pictures, medical documents).
- Protection of API keys and sensitive data.
- Designed with scalability and maintainability in mind.

---

## Tech Stack
- **Backend:** ASP.NET Core Web API
- **Database:** SQL Server (or any relational database)
- **Authentication:** JWT (JSON Web Tokens)
- **Version Control:** Git & GitHub
- **Environment:** Visual Studio or VS Code
- **Scripting:** PowerShell (for environment setup and secret management)
- **Security:** GitHub Secret Scanning and Push Protection enabled

---

## Getting Started

### Prerequisites
- [.NET SDK](https://dotnet.microsoft.com/download)
- SQL Server or compatible relational database
- Git installed on your machine

### Installation and Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/Yousefmm09/DoctorAppointmentApi.git
    cd DoctorAppointmentApi
    ```

2. Configure environment variables or create a `.env` file (do **not** commit secrets):
   Example `.env` file content:

3. Apply database migrations:
 ```bash
 dotnet ef database update
 ```

4. Run the API server:
 ```bash
 dotnet run
 ```

## API Endpoints

### Authentication & Account

- `POST /api/Account/registration/doctor` — Register a new doctor  
- `POST /api/Account/registration/patient` — Register a new patient  
- `POST /api/Account/login` — Login and receive authentication token  

### Admin

- `GET /api/Admin/All_Doctor` — Get list of all doctors  
- `GET /api/Admin/get-all-clinics` — Get all clinics  
- `GET /api/Admin/dashboard` — Admin dashboard summary  
- `GET /api/Admin/get-all-Appointment` — Get all appointments  
- `DELETE /api/Admin/delete-doctor/{id}` — Delete a doctor by ID  

### Appointments

- `GET /api/Appointment` — List all appointments  
- `POST /api/Appointment` — Create a new appointment (patients only)  
- `GET /api/Appointment/{id}` — Get appointment details by ID  
- `PUT /api/Appointment/{id}` — Update appointment by ID  
- `GET /api/Appointment/available-slots` — Get available appointment slots  
- `GET /api/Appointment/get-doctor-slots` — Get doctor’s available slots  
- `GET /api/Appointment/check-availability` — Check slot availability  
- `POST /api/Appointment/cancel/{id}` — Cancel an appointment  
- `POST /api/Appointment/confirm/{id}` — Confirm an appointment  
- `PUT /api/Appointment/doctor-change-appointment-time/{id}` — Doctor changes appointment time  
- `PUT /api/Appointment/update-slot/{id}` — Update an appointment slot  
- `DELETE /api/Appointment/delete-slot/{id}` — Delete an appointment slot  

### Doctors

- `GET /api/Doctor` — Get all doctors  
- `POST /api/Doctor/add-doctor` — Add a new doctor  
- `GET /api/Doctor/{id}` — Get doctor by ID  
- `GET /api/Doctor/GetDoctorBySpecializationName/{name}` — Get doctors by specialization  
- `GET /api/Doctor/by-user-id/{userId}` — Get doctor by user ID  
- `GET /api/Doctor/Profile/{id}` — Get doctor profile  
- `PUT /api/Doctor/update-doctor-profile/{id}` — Update doctor profile  
- `GET /api/Doctor/profile-picture/{id}` — Get doctor profile picture  
- `PUT /api/Doctor/update-doctor-profile-picture/{id}` — Update doctor profile picture  
- `DELETE /api/Doctor/delete-doctor/{id}` — Delete doctor by ID  
- `GET /api/Doctor/get-appointment-from-doctor/{id}` — Get doctor’s appointments  
- `GET /api/Doctor/doctor/dashboard/{doctorId}` — Get doctor dashboard data  

### Doctor Availability

- `GET /api/DoctorAvailability/doctor/{doctorId}` — Get doctor availability  
- `POST /api/DoctorAvailability/add` — Add availability  
- `DELETE /api/DoctorAvailability/delete/{id}` — Delete availability  
- `PUT /api/DoctorAvailability/update/{id}` — Update availability  

### Patients

- `GET /api/Patient` — Get all patients  
- `POST /api/Patient` — Add new patient  
- `GET /api/Patient/{id}` — Get patient by ID  
- `PUT /api/Patient/{id}` — Update patient by ID  
- `GET /api/Patient/appointments/{id}` — Get patient appointments  
- `GET /api/Patient/profile/{id}` — Get patient profile  
- `PUT /api/Patient/update-profile/{id}` — Update patient profile  
- `GET /api/Patient/profile-picture/{id}` — Get patient profile picture  
- `GET /api/Patient/by-user-id/{userId}` — Get patient by user ID  
- `GET /api/Patient/Cancel_Appointment/{id}` — Cancel patient appointment  
- `POST /api/Patient/confirm/{id}` — Confirm patient appointment  

### Chat & ChatBot

- `POST /api/Chat/sendMessage` — Send chat message  
- `GET /api/Chat/conversations` — Get chat conversations  
- `GET /api/Chat/messages` — Get chat messages  
- `POST /api/Chat/markAsRead` — Mark messages as read  
- `GET /api/Chat/unreadCount` — Get unread message count  
- `POST /api/ChatBot/chat` — Chat with bot  
- `GET /api/ChatBot/test` — Test chatbot  

### Ratings

- `POST /api/Ratings` — Submit rating  
- `GET /api/Ratings/doctor` — Get doctor ratings  
- `GET /api/Ratings/doctor-public` — Get public doctor ratings  
- `GET /api/Ratings/doctor/average` — Get average doctor rating  
- `GET /api/Ratings/rating/by-user-id/{userId}` — Get ratings by user ID  

### Specializations

- `GET /api/Specializations/AllSpecializations` — Get all specializations  
- `POST /api/Specializations/bulk` — Add specializations in bulk  


## Security Best Practices

- Never commit API keys or sensitive information into version control.
- Use environment variables or `.env` files (excluded from Git) for secrets.
- Always run the API under HTTPS in production.
- Rotate API keys regularly.
- Monitor GitHub’s security alerts and abide by push protection rules.

---

## Where to Add Your Personal Data / Secrets

- **OpenAI API Key:**  
Add it as an environment variable `OpenAI__ApiKey` or inside your local `.env` file (never commit it to Git).

- **Database Connection String:**  
Add it in `appsettings.json` (for local dev only) or better, as environment variable `ConnectionStrings__DefaultConnection`.

- **Contact Info:**  
Replace with your real email and details in the Contact section below.

---

## Contribution Guidelines

If you want to contribute:

1. Fork the repository.
2. Create a new branch describing your feature or fix.
3. Commit your changes with clear messages.
4. Open a Pull Request with a detailed description of your changes.

---

## License

This project is licensed under the MIT License.

---

## Contact

For questions or support, contact:

- Name: Yousef Mohamed  
- Email:yousefmohsen232@gmail.com  
- Project URL: [https://github.com/Yousefmm09/DoctorAppointmentApi](https://github.com/Yousefmm09/DoctorAppointmentApi)

