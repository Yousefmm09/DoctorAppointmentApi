# Tabebek - Doctor Appointment System Frontend

This is the frontend application for the Tabebek Doctor Appointment System, built with React, Tailwind CSS, and Vite.

## Features

- **Patient Features**
  - Find and book appointments with doctors
  - View and manage appointments
  - Rate doctors and provide feedback
  - Chat with doctors
  - View personal profile and history

- **Doctor Features**
  - Manage availability schedule
  - View and manage appointments
  - Chat with patients
  - View ratings and feedback
  - Manage profile information

- **Admin Features**
  - Manage doctors and specializations
  - View all appointments
  - System monitoring dashboard

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher

## Getting Started

1. **Clone the repository**

```bash
git clone <repository-url>
cd Doctor-Appointment-Booking-System--main/frontend
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm run dev
```

4. **Open your browser**

Navigate to `http://localhost:5173` to see the application running.

## Build for Production

To build the application for production:

```bash
# Using the build script
./build-production.sh  # For Unix/Linux/macOS
# OR
build-production.bat   # For Windows

# OR manually
npm run build
```

The production build will be created in the `dist/` directory.

## Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the project root with the following variables:

```
VITE_APP_ENV=development
VITE_APP_TITLE="Tabebek - Medical Appointment System"
VITE_API_URL=http://localhost:5109
```

For production, create a `.env.production` file with appropriate values.

## Project Structure

```
frontend/
├── public/             # Static files
├── src/
│   ├── assets/         # Images, fonts, and other assets
│   ├── components/     # Reusable components
│   ├── config/         # Configuration files
│   ├── context/        # React context providers
│   ├── layouts/        # Page layouts
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
└── package.json        # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build

## Customization

### Styling

The application uses Tailwind CSS for styling. You can customize the theme in `tailwind.config.js`.

### Environment

To add a new environment variable, update the `.env` file and reference it in your code with `import.meta.env.VARIABLE_NAME`.

## Deployment

See the [DEPLOYMENT.md](./DEPLOYMENT.md) file for deployment instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
