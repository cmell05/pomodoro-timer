// Pomodoro Timer Setup
const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

let workDuration = DEFAULT_WORK_MINUTES * 60;
let breakDuration = DEFAULT_BREAK_MINUTES * 60;
let isWorkTime = true;
let timer;
let currentTime = workDuration;
let pendingMode = null;

const TASKS_KEY = "pomodoroTasks";
const SESSIONS_KEY = "pomodoroSessions";
const TIMER_SETTINGS_KEY = "pomodoroTimerSettings";
const API_BASE_URL = window.POMODORO_API_BASE_URL || "http://localhost:4000";

const sessionDisplay = document.getElementById("sessionDisplay");
const statusDisplay = document.getElementById("status");
const startStopBtn = document.getElementById("startStopBtn");
const resetBtn = document.getElementById("resetBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const workMinutesInput = document.getElementById("workMinutesInput");
const breakMinutesInput = document.getElementById("breakMinutesInput");
const themeToggle = document.getElementById("themeToggle");
const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");
const analyticsBtn = document.getElementById("analyticsBtn");
const analyticsSection = document.getElementById("analyticsSection");
const analyticsDiv = document.getElementById("analyticsData");
const mainContainer = document.querySelector(".container");
const backBtn = document.getElementById("backBtn");
const loginLink = document.getElementById("loginLink");
const signupLink = document.getElementById("signupLink");
const logoutBtn = document.getElementById("logoutBtn");
const sessionDialog = document.getElementById("sessionDialog");
const sessionDialogTitle = document.getElementById("sessionDialogTitle");
const sessionDialogMessage = document.getElementById("sessionDialogMessage");
const sessionDialogKicker = document.getElementById("sessionDialogKicker");
const sessionDialogBtn = document.getElementById("sessionDialogBtn");

let isRunning = false;

function renderAuthControls() {
  const isLoggedIn = Boolean(getToken());

  if (loginLink) loginLink.hidden = isLoggedIn;
  if (signupLink) signupLink.hidden = isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
}

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
  renderAuthControls();
  renderTasks();

  if (analyticsSection && mainContainer) {
    analyticsSection.style.display = "none";
    mainContainer.style.display = "grid";
  }
  if (analyticsDiv) {
    analyticsDiv.innerHTML = "";
  }
});

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getCurrentStorageOwner() {
  try {
    const currentUser = JSON.parse(
      localStorage.getItem("pomodoroCurrentUser") || "null"
    );
    if (currentUser?.email) {
      return `user:${currentUser.email.toLowerCase()}`;
    }
  } catch {
    // Fall back to guest storage if saved user data is malformed.
  }

  return "guest";
}

function getScopedStorageKey(key) {
  return `${key}:${getCurrentStorageOwner()}`;
}

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTasks() {
  return readStoredArray(getScopedStorageKey(TASKS_KEY));
}

function saveTasks(tasks) {
  localStorage.setItem(getScopedStorageKey(TASKS_KEY), JSON.stringify(tasks));
}

function getSessions() {
  return readStoredArray(getScopedStorageKey(SESSIONS_KEY));
}

function saveSessions(sessions) {
  localStorage.setItem(
    getScopedStorageKey(SESSIONS_KEY),
    JSON.stringify(sessions)
  );
}

function getToken() {
  return localStorage.getItem("token");
}

function getTimerSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(TIMER_SETTINGS_KEY) || "{}");
    return {
      workMinutes: Number(settings.workMinutes) || DEFAULT_WORK_MINUTES,
      breakMinutes: Number(settings.breakMinutes) || DEFAULT_BREAK_MINUTES,
    };
  } catch {
    return {
      workMinutes: DEFAULT_WORK_MINUTES,
      breakMinutes: DEFAULT_BREAK_MINUTES,
    };
  }
}

function saveTimerSettings(workMinutes, breakMinutes) {
  localStorage.setItem(
    TIMER_SETTINGS_KEY,
    JSON.stringify({ workMinutes, breakMinutes })
  );
}

function applyTimerSettings({ workMinutes, breakMinutes }) {
  workDuration = workMinutes * 60;
  breakDuration = breakMinutes * 60;

  if (workMinutesInput) workMinutesInput.value = workMinutes;
  if (breakMinutesInput) breakMinutesInput.value = breakMinutes;

  if (!isRunning) {
    currentTime = isWorkTime ? workDuration : breakDuration;
    updateDisplay();
  }
}

function openSettings() {
  const settings = getTimerSettings();
  if (workMinutesInput) workMinutesInput.value = settings.workMinutes;
  if (breakMinutesInput) breakMinutesInput.value = settings.breakMinutes;
  settingsDialog.hidden = false;
  settingsBtn.classList.add("is-active");
  workMinutesInput?.focus();
}

function closeSettings() {
  settingsDialog.hidden = true;
  settingsBtn.classList.remove("is-active");
}

function showSessionDialog({ title, message, kicker, buttonText, nextMode }) {
  sessionDialogTitle.textContent = title;
  sessionDialogMessage.textContent = message;
  sessionDialogKicker.textContent = kicker;
  sessionDialogBtn.textContent = buttonText;
  pendingMode = nextMode;
  sessionDialog.hidden = false;
  sessionDialogBtn.focus();
}

function closeSessionDialog() {
  sessionDialog.hidden = true;
  pendingMode = null;
}

function startMode(mode) {
  clearInterval(timer);
  isRunning = false;
  isWorkTime = mode === "work";
  currentTime = isWorkTime ? workDuration : breakDuration;
  updateDisplay();
  toggleTimer();
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

    clearInterval(timer);
    isRunning = false;
    startStopBtn.textContent = "START";
    const completedWork = isWorkTime;
    updateDisplay();
    showSessionDialog(
      completedWork
        ? {
            kicker: "Work complete",
            title: "Start your break?",
            message: "Nice work. Take a few minutes to reset before the next focus block.",
            buttonText: "START BREAK",
            nextMode: "break",
          }
        : {
            kicker: "Break complete",
            title: "Start another focus session?",
            message: "Your break is done. Begin the next work session when ready.",
            buttonText: "START WORK",
            nextMode: "work",
          }
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

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "task-delete";
    deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
    deleteButton.textContent = "🗑";
    deleteButton.addEventListener("click", () => {
      const updatedTasks = getTasks().filter(
        (storedTask) => storedTask.id !== task.id
      );
      saveTasks(updatedTasks);
      renderTasks();
    });

    listItem.appendChild(checkbox);
    listItem.appendChild(span);
    listItem.appendChild(deleteButton);
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

function hasLocalAnalyticsData() {
  return (
    getSessions().length > 0 ||
    getTasks().some((task) => task.completed)
  );
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
                    (task) => {
                      const taskName = task.task || task.text || "Untitled task";
                      return `
                        <li>
                        <span>${taskName}</span>
                        <span class="completion-date">
                          ${new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      </li>
                      `;
                    }
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
    analyticsDiv.innerHTML = `
      <h2>Login required</h2>
      <p>Please login or sign up to view analytics.</p>
    `;
    analyticsSection.style.display = "block";
    mainContainer.style.display = "none";
    window.location.href = "login.html";
    return;
  }

  const hasLocalData = hasLocalAnalyticsData();
  const response = await fetch(`${API_BASE_URL}/api/analytics`, {
    method: hasLocalData ? "PUT" : "GET",
    headers: {
      ...(hasLocalData ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    ...(hasLocalData ? { body: JSON.stringify(getAnalyticsPayload()) } : {}),
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

settingsBtn.addEventListener("click", () => {
  openSettings();
});

settingsPanel.addEventListener("submit", (event) => {
  event.preventDefault();

  const workMinutes = Number(workMinutesInput.value);
  const breakMinutes = Number(breakMinutesInput.value);

  if (workMinutes < 1 || breakMinutes < 1) {
    workMinutesInput.focus();
    return;
  }

  saveTimerSettings(workMinutes, breakMinutes);
  applyTimerSettings({ workMinutes, breakMinutes });
  resetTimer();
  closeSettings();
});

closeSettingsBtn.addEventListener("click", closeSettings);
cancelSettingsBtn.addEventListener("click", closeSettings);
sessionDialogBtn.addEventListener("click", () => {
  const nextMode = pendingMode;
  closeSessionDialog();

  if (nextMode) {
    startMode(nextMode);
  }
});
settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    closeSettings();
  }
});
sessionDialog.addEventListener("click", (event) => {
  if (event.target === sessionDialog) {
    closeSessionDialog();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !settingsDialog.hidden) {
    closeSettings();
  }
  if (event.key === "Escape" && !sessionDialog.hidden) {
    closeSessionDialog();
  }
});

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

applyTimerSettings(getTimerSettings());
updateDisplay();
renderAuthControls();
renderTasks();
