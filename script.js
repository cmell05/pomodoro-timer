// Pomodoro Timer Setup
let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let isWorkTime = true;
let timer;
let currentTime = workDuration;

const TASKS_KEY = "pomodoroTasks";
const SESSIONS_KEY = "pomodoroSessions";
const API_BASE_URL = window.POMODORO_API_BASE_URL || "http://localhost:4000";

const sessionDisplay = document.getElementById("sessionDisplay");
const statusDisplay = document.getElementById("status");
const startStopBtn = document.getElementById("startStopBtn");
const resetBtn = document.getElementById("resetBtn");
const themeToggle = document.getElementById("themeToggle");
const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");
const analyticsBtn = document.getElementById("analyticsBtn");
const analyticsSection = document.getElementById("analyticsSection");
const analyticsDiv = document.getElementById("analyticsData");
const mainContainer = document.querySelector(".container");
const backBtn = document.getElementById("backBtn");
const logoutBtn = document.getElementById("logoutBtn");

let isRunning = false;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.classList.toggle("is-dark", isDark);
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }
}

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

themeToggle?.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("pomodoroCurrentUser");
  alert("Logged out.");
});

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTasks() {
  return readStoredArray(TASKS_KEY);
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function getSessions() {
  return readStoredArray(SESSIONS_KEY);
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getToken() {
  return localStorage.getItem("token");
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function updateDisplay() {
  sessionDisplay.textContent = formatTime(currentTime);
  statusDisplay.textContent = isWorkTime ? "WORK TIME" : "BREAK TIME";
}

function recordCompletedSession() {
  const sessions = getSessions();
  sessions.push({
    id: createId(),
    completedAt: new Date().toISOString(),
    minutes: workDuration / 60,
  });
  saveSessions(sessions);
}

function toggleTimer() {
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
    startStopBtn.textContent = "START";
    return;
  }

  timer = setInterval(() => {
    if (currentTime > 0) {
      currentTime--;
      updateDisplay();
      return;
    }

    if (isWorkTime) {
      recordCompletedSession();
    }

    isWorkTime = !isWorkTime;
    currentTime = isWorkTime ? workDuration : breakDuration;
    updateDisplay();
    alert(
      isWorkTime
        ? "Break over! Back to work!"
        : "Work session complete! Time for a break!"
    );
  }, 1000);

  isRunning = true;
  startStopBtn.textContent = "PAUSE";
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  isWorkTime = true;
  currentTime = workDuration;
  startStopBtn.textContent = "START";
  updateDisplay();
}

function renderTasks() {
  const tasks = getTasks();
  projectList.innerHTML = "";

  tasks.forEach((task) => {
    const listItem = document.createElement("li");
    if (task.completed) {
      listItem.classList.add("completed-task");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      const updatedTasks = getTasks().map((storedTask) =>
        storedTask.id === task.id
          ? {
              ...storedTask,
              completed: checkbox.checked,
              completedAt: checkbox.checked ? new Date().toISOString() : null,
            }
          : storedTask
      );

      saveTasks(updatedTasks);
      renderTasks();
    });

    const span = document.createElement("span");
    span.textContent = task.text;

    listItem.appendChild(checkbox);
    listItem.appendChild(span);
    projectList.appendChild(listItem);
  });
}

function addTask() {
  const taskText = projectInput.value.trim();
  if (!taskText) return;

  const tasks = getTasks();
  tasks.push({
    id: createId(),
    text: taskText,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });

  saveTasks(tasks);
  projectInput.value = "";
  renderTasks();
}

function getAnalyticsPayload() {
  const tasks = getTasks();
  const sessions = getSessions();
  const completedTasks = tasks.filter((task) => task.completed);
  const totalMinutes = sessions.reduce(
    (sum, session) => sum + Number(session.minutes || 0),
    0
  );

  return {
    sessions: sessions.length,
    totalMinutes,
    completedTasks: completedTasks.map((task) => ({
      task: task.text,
      completedAt: task.completedAt,
    })),
  };
}

function renderAnalytics(data = getAnalyticsPayload()) {
  const completedTasks = data.completedTasks || [];

  analyticsDiv.innerHTML = `
    <h2>Your Analytics Data</h2>
    <div class="analytics-stats">
      <div class="stat-item">
        <h3>Sessions Completed</h3>
        <p>${data.sessions || 0}</p>
      </div>
      <div class="stat-item">
        <h3>Total Time Worked</h3>
        <p>${data.totalMinutes || 0} minutes</p>
      </div>
      <div class="stat-item">
        <h3>Tasks Accomplished</h3>
        ${
          completedTasks.length
            ? `<ul class="tasks-list">
                ${completedTasks
                  .map(
                    (task) => `
                      <li>
                        <span>${task.text}</span>
                        <span class="completion-date">
                          ${new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      </li>
                    `
                  )
                  .join("")}
              </ul>`
            : "<p>No completed tasks yet.</p>"
        }
      </div>
    </div>
  `;
}

async function syncAnalytics() {
  const token = getToken();
  if (!token) {
    alert("Please login or sign up to view analytics.");
    window.location.href = "login.html";
    return;
  }

  const response = await fetch(`${API_BASE_URL}/api/analytics`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(getAnalyticsPayload()),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to sync analytics");
  }

  renderAnalytics(data);
}

startStopBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
addProjectBtn.addEventListener("click", addTask);

projectInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});

analyticsBtn.addEventListener("click", async () => {
  analyticsSection.style.display = "block";
  mainContainer.style.display = "none";
  analyticsDiv.innerHTML = "<p>Loading analytics...</p>";

  try {
    await syncAnalytics();
  } catch (error) {
    console.error("Analytics error:", error);
    analyticsDiv.innerHTML = "<p>Error loading analytics.</p>";
  }
});

backBtn.addEventListener("click", () => {
  analyticsSection.style.display = "none";
  mainContainer.style.display = "grid";
});

updateDisplay();
renderTasks();
