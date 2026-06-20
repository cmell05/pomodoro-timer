window.POMODORO_API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://your-pomodoro-backend.onrender.com";
