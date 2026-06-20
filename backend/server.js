const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "local-development-secret";
const MONGODB_URI = process.env.MONGODB_URI;
const localDataPath = path.join(__dirname, "local-data.json");

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    return new URL(origin).hostname.endsWith(".netlify.app");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const analyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessions: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    completedTasks: [
      {
        task: String,
        completedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Analytics = mongoose.model("Analytics", analyticsSchema);

async function connectDatabase() {
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI is not set. Using backend/local-data.json.");
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");
}

async function readLocalData() {
  try {
    return JSON.parse(await fs.readFile(localDataPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { users: [], analytics: {} };
    }
    throw error;
  }
}

async function writeLocalData(data) {
  await fs.writeFile(localDataPath, JSON.stringify(data, null, 2));
}

function createToken(user) {
  return jwt.sign(
    {
      id: String(user._id || user.id),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function normalizeAnalytics(payload) {
  return {
    sessions: Number(payload.sessions || 0),
    totalMinutes: Number(payload.totalMinutes || 0),
    completedTasks: Array.isArray(payload.completedTasks)
      ? payload.completedTasks.map((task) => ({
          task: String(task.task || ""),
          completedAt: task.completedAt ? new Date(task.completedAt) : new Date(),
        }))
      : [],
  };
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired auth token" });
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    storage: MONGODB_URI ? "mongodb" : "local-json",
  });
});

app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (MONGODB_URI) {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
    });

    await Analytics.create({ userId: user._id });

    return res.status(201).json({
      token: createToken(user),
      user: { name: user.name, email: user.email },
    });
  }

  const data = await readLocalData();
  if (data.users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email: normalizedEmail,
    passwordHash,
  };
  data.users.push(user);
  data.analytics[user.id] = { sessions: 0, totalMinutes: 0, completedTasks: [] };
  await writeLocalData(data);

  return res.status(201).json({
    token: createToken(user),
    user: { name: user.name, email: user.email },
  });
});

app.post("/api/login", async (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (MONGODB_URI) {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json({
      token: createToken(user),
      user: { name: user.name, email: user.email },
    });
  }

  const data = await readLocalData();
  const user = data.users.find((storedUser) => storedUser.email === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  return res.json({
    token: createToken(user),
    user: { name: user.name, email: user.email },
  });
});

app.get("/api/analytics", authMiddleware, async (req, res) => {
  if (MONGODB_URI) {
    const analytics =
      (await Analytics.findOne({ userId: req.user.id })) ||
      (await Analytics.create({ userId: req.user.id }));

    return res.json({
      sessions: analytics.sessions,
      totalMinutes: analytics.totalMinutes,
      completedTasks: analytics.completedTasks,
    });
  }

  const data = await readLocalData();
  return res.json(
    data.analytics[req.user.id] || { sessions: 0, totalMinutes: 0, completedTasks: [] }
  );
});

app.put("/api/analytics", authMiddleware, async (req, res) => {
  const analytics = normalizeAnalytics(req.body);

  if (MONGODB_URI) {
    const updated = await Analytics.findOneAndUpdate(
      { userId: req.user.id },
      analytics,
      { new: true, upsert: true }
    );

    return res.json({
      sessions: updated.sessions,
      totalMinutes: updated.totalMinutes,
      completedTasks: updated.completedTasks,
    });
  }

  const data = await readLocalData();
  data.analytics[req.user.id] = analytics;
  await writeLocalData(data);
  return res.json(analytics);
});

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Pomodoro backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });
