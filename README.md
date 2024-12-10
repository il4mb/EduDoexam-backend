# EduDOExam Backend
**Status**: In Progress 🚧

## Welcome to EduDOExam API

The EduDOExam API provides backend services for managing and interacting with the EduDOExam platform. It supports various features such as user authentication, exam management, and more.

## Getting Started

To get started with the EduDOExam backend, follow these steps:

### 1. Clone the Project

First, clone the project repository to your local machine:

```bash
git clone https://github.com/il4mb/EduDoexam-backend
```

### 2. Install Dependencies

Navigate into the project directory and install the required dependencies:

```bash
cd EduDoexam-backend && npm install
```

This will install all necessary Node.js modules defined in the `package.json` file.

### 3. Run the Development Server

To start the development server, run the following command:

```bash
npm run dev
```

This will start the server, and it will be available at [http://localhost:5000](http://localhost:5000).

### 4. API Documentation

Once the server is running, you can explore the available API endpoints. The API documentation will provide detailed information on the functionality of each route and how to use it.

### 5. Environment Configuration

Before starting the app in a production environment, ensure to configure the required environment variables. You can use a `.env` file to store sensitive information such as database credentials, API keys, etc.

Sample `.env` file:

```
PORT=8081
IP_ADDRESS=your local ip address

FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_APP_ID=
FIREBASE_ADMIN_SERVICE_JSON=

# it allow use another bucket in another project
GCLOUD_PROJECT_SERVICE_JSON=
GCLOUD_PROJECT_ID=
GCLOUD_STORAGE_BUCKET=
```

### 6. Available Scripts

Here are some available NPM scripts that you can use for different tasks:

- **Run the app in development mode**: `npm run dev`
- **Run tests**: `npm test`
- **Lint the code**: `npm run lint`
- **Build the project**: `npm run build`

## Troubleshooting

If you encounter any issues, make sure that:
- You have the correct Node.js version installed (e.g., 14.x or later).
- All dependencies are installed correctly by running `npm install`.
- The development server is running without errors.

For further questions or support, feel free to open an issue on the [GitHub repository](https://github.com/il4mb/EduDoexam-backend).