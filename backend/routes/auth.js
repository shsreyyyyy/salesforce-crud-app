const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const router = express.Router();

const {
  SF_CLIENT_ID,
  SF_CLIENT_SECRET,
  SF_REDIRECT_URI,
  SF_LOGIN_URL,
  FRONTEND_URL,
} = process.env;

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(codeVerifier) {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
}

// Salesforce Login
router.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;

  const authUrl =
    `${SF_LOGIN_URL}/services/oauth2/authorize?` +
    `response_type=code` +
    `&client_id=${encodeURIComponent(SF_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(SF_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent("api refresh_token offline_access")}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  res.redirect(authUrl);
});

// Salesforce OAuth Callback
router.get("/callback", async (req, res) => {
  const {
    code,
    state,
    error,
    error_description,
  } = req.query;

  if (error) {
    return res.redirect(
      `${FRONTEND_URL}?auth_error=${encodeURIComponent(
        error_description || error
      )}`
    );
  }

  if (!state || state !== req.session.oauthState) {
    return res.redirect(
      `${FRONTEND_URL}?auth_error=invalid_state`
    );
  }

  try {
    const tokenRes = await axios.post(
      `${SF_LOGIN_URL}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: SF_CLIENT_ID,
        client_secret: SF_CLIENT_SECRET,
        redirect_uri: SF_REDIRECT_URI,
        code_verifier: req.session.codeVerifier,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const {
      access_token,
      refresh_token,
      instance_url,
    } = tokenRes.data;

    // Store Salesforce session data
    req.session.sf = {
      accessToken: access_token,
      refreshToken: refresh_token,
      instanceUrl: instance_url,
    };

    delete req.session.oauthState;
    delete req.session.codeVerifier;

    // IMPORTANT:
    // Explicitly save session to Redis before redirecting
    req.session.save((saveError) => {
      if (saveError) {
        console.error("Session save error:", saveError);

        return res.redirect(
          `${FRONTEND_URL}?auth_error=session_save_failed`
        );
      }

      console.log("Salesforce session saved successfully");

      res.redirect(
        `${FRONTEND_URL}/?logged_in=1`
      );
    });
  } catch (err) {
    console.error(
      "OAuth callback error:",
      err.response?.data || err.message
    );

    res.redirect(
      `${FRONTEND_URL}?auth_error=token_exchange_failed`
    );
  }
});

// Check Authentication Status
router.get("/status", (req, res) => {
  res.set("Cache-Control", "no-store");

  if (req.session.sf?.accessToken) {
    return res.json({
      loggedIn: true,
      instanceUrl: req.session.sf.instanceUrl,
    });
  }

  res.json({
    loggedIn: false,
  });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Logout failed",
      });
    }

    res.json({
      success: true,
    });
  });
});

module.exports = router;