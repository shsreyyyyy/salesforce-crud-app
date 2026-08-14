require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { Redis } = require("@upstash/redis");
const { RedisStore } = require("connect-redis");

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");

const app = express();

const isProd = process.env.NODE_ENV === "production";

// Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// Session stored in Upstash Redis
app.use(
  session({
    store: new RedisStore({
      client: redis,
      prefix: "sf-session:",
      serializer: {
        stringify: (session) => JSON.stringify(session),
        parse: (session) =>
          typeof session === "string" ? JSON.parse(session) : session,
      },
    }),

    name: "sf.sid",
    secret: process.env.SESSION_SECRET,

    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use("/auth", authRoutes);
app.use("/api", recordRoutes);

app.get("/", (req, res) => {
  res.send("Salesforce CRUD backend is running.");
});

module.exports = app;