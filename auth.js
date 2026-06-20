const API_BASE_URL = window.POMODORO_API_BASE_URL || "http://localhost:4000";
const authMessage = document.getElementById("authMessage");

function setAuthSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("pomodoroCurrentUser", JSON.stringify(data.user));
}

function showAuthMessage(message) {
  if (!authMessage) return;

  authMessage.textContent = "";

  const icon = document.createElement("span");
  icon.className = "form-message-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "!";

  const text = document.createElement("span");
  text.textContent = message;

  authMessage.append(icon, text);
  authMessage.hidden = false;
}

function clearAuthMessage() {
  if (!authMessage) return;

  authMessage.textContent = "";
  authMessage.hidden = true;
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAuthMessage();

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
        showAuthMessage("Invalid credentials. Please try again.");
        return;
      }

      setAuthSession(data);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Login error:", error);
      showAuthMessage("We could not reach the server. Please try again.");
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAuthMessage();

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
        showAuthMessage(data.message || "Could not create your account.");
        return;
      }

      setAuthSession(data);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Signup error:", error);
      showAuthMessage("We could not reach the server. Please try again.");
    }
  });
}
