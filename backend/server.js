require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");

const app = express();

const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    name: "sf.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
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