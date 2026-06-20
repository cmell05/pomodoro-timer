# Pomodoro Timer

A focused Pomodoro timer web app with local task tracking, customizable work/break sessions, light and dark themes, account login, and authenticated analytics.

## Features

- Pomodoro timer with work and break sessions
- Custom work and break durations
- Light/dark mode toggle
- Local task list with add, complete, and delete actions
- Signup/login with JWT authentication
- User-specific analytics for completed sessions, total focus time, and completed tasks
- Responsive frontend built with plain HTML, CSS, and JavaScript
- Express backend with MongoDB persistence for users and analytics

## Tech Stack

**Frontend**

- HTML
- CSS
- JavaScript
- `localStorage` for per-user task storage and timer preferences

**Backend**

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- bcryptjs for password hashing
- JSON Web Tokens for authenticated API requests
- CORS for frontend/backend communication

## Project Structure

```text
.
├── index.html          # Main timer UI
├── login.html          # Login page
├── signup.html         # Signup page
├── script.js           # Timer, tasks, settings, analytics UI logic
├── auth.js             # Login/signup frontend logic
├── config.js           # Local vs production backend URL
├── style.css           # App styling
└── backend/
    ├── server.js       # Express API, auth, analytics routes
    └── package.json    # Backend dependencies and scripts
```

## Local Development

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

The backend runs on:

```text
http://localhost:4000
```

If `MONGODB_URI` is not configured, the backend falls back to a local JSON file for development.

### 2. Start the frontend

From the project root:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

`config.js` automatically points localhost to `http://localhost:4000`.

## Backend Environment Variables

Create `backend/.env` for local backend configuration:

```env
JWT_SECRET=replace_with_a_long_random_secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pomodoro
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

For production, add the same variables in the hosting provider's environment variable settings.

## API Endpoints

```text
GET  /api/health
POST /api/signup
POST /api/login
GET  /api/analytics
PUT  /api/analytics
```

Protected analytics routes require:

```text
Authorization: Bearer <jwt_token>
```

## Deployment

The backend is configured to run as a Node service.

Current production backend URL:

```text
https://pomodoro-timer-l36d.onrender.com
```

The frontend can be deployed as a static site on Vercel, Netlify, or GitHub Pages. In production, `config.js` points API requests to the Render backend.

## Notes

- Tasks are stored in the browser using user-scoped `localStorage` keys.
- Analytics are stored per authenticated user in the backend.
- `.env`, local backend data, and `node_modules` should not be committed.
