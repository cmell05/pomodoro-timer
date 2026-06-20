const API_BASE_URL = window.POMODORO_API_BASE_URL || "http://localhost:4000";

function setAuthSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("pomodoroCurrentUser", JSON.stringify(data.user));
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Login failed");
        return;
      }

      setAuthSession(data);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check that the backend is running.");
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Signup failed");
        return;
      }

      setAuthSession(data);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Signup error:", error);
      alert("Signup failed. Please check that the backend is running.");
    }
  });
}
