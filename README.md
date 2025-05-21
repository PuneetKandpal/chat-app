# cw\.bridge Chat Application

A real-time chat application that allows users to create accounts, log in/out, customize their UI theme, update profile pictures, and chat with multiple users simultaneously.

## 🔗 Live Demo

#### Kindly wait for at least 1 to 2 minutes for server to spin up
[cw.bridge](https://cw-bridge.onrender.com/)


## 🔧 Tech Stack

* **Frontend:** React, Tailwind CSS, Daisy UI
* **Backend:** Express.js, WebSocket (socket.io)
* **Database:** MongoDB
* **Authentication:** JSON Web Tokens (JWT)
* **Media Storage:** Cloudinary

## 🚀 Key Features

1. **User Management**

   * Sign up, log in, and log out
   * Update profile (change display name, profile picture)
   * Choose and persist UI theme (light/dark) from settings

2. **Real-time Chat**

   * One-to-one messaging between users
   * Typing indicators
   * Message notifications in the sidebar per conversation
   * Local caching of messages to minimize database reads
   * Delivery receipts using socket.io acknowledgements

3. **Search & Notifications**

   * Search users by name or email
   * Real-time in-app notifications for new messages

## 📋 Prerequisites

* **Node.js** v16+ and **npm** installed
* **MongoDB** (local or Atlas cluster)
* **Cloudinary** account for media storage (profile pictures)

## ⚙️ Environment Variables

Create a file named `.env` in the project root and add the following variables:

```env
# MongoDB connection URI (local or cloud)
MONGODB_URI=<your_mongodb_connection_string>

# Express server port
PORT=5001

# JWT secret for signing tokens
JWT_SECRET=<your_jwt_secret>

# Cloudinary credentials for image uploads
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>

# Node environment (development or production)
NODE_ENV=development | production
```

> **Tip:** Never commit your `.env` file to source control. Add it to your `.gitignore`.

## 🛠️ Setup & Local Development

Follow these steps to get the application running locally:

1. **Clone the repository**

   ```bash
   git clone https://github.com/PuneetKandpal/chat-app.git
   cd cw.bridge
   ```

2. **Build the code**

   ```bash
   npm run build
   ```

3. **Run the code**

   ```bash
   npm run start
   ```

6. **Access the app**

   * Navigate to `http://localhost:5001` in your browser.

## 📦 Available Scripts

* `npm run build` – Builds the React frontend for production.
* `npm run start` – Starts the Express server with Socket.io.
* `npm run dev` – (Optional) Starts the server in development mode with nodemon setup node env as development.


## 📁 Project Structure

```
├── backend/              # React application
│   ├── public/          # Static assets
│   └── src/             # Components, hooks, pages
├── frontend/              # Express server
│   ├── controllers/     # Route handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   └── utils/           # Helpers (JWT, Cloudinary config)
├── .env                 # Environment variables (local)
├── package.json         # Scripts & dependencies
└── README.md
```

## ❤️ Contributing

Contributions, issues, and feature requests are welcome! Feel free to:

* Fork the repo
* Create a new branch (`git checkout -b feature/my-feature`)
* Commit your changes (`git commit -m 'Add some feature'`)
* Push to the branch (`git push origin feature/my-feature`)
* Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
