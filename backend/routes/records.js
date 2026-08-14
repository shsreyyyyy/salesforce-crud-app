const express = require("express");
const axios = require("axios");
const objectsConfig = require("../config/objects");

const router = express.Router();
const API_VERSION = process.env.SF_API_VERSION || "v60.0";

function requireAuth(req, res, next) {
  if (!req.session.sf?.accessToken) {
    return res.status(401).json({ error: "Not authenticated with Salesforce" });
  }
  next();
}
router.use(requireAuth);

async function refreshAccessToken(req) {
  const { refreshToken } = req.session.sf;
  const resp = await axios.post(
    `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SF_CLIENT_ID,
      client_secret: process.env.SF_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  req.session.sf.accessToken = resp.data.access_token;
  return resp.data.access_token;
}

async function sfRequest(req, config) {
  const doCall = (token) =>
    axios({
      ...config,
      baseURL: req.session.sf.instanceUrl,
      headers: { ...(config.headers || {}), Authorization: `Bearer ${token}` },
    });

  try {
    return await doCall(req.session.sf.accessToken);
  } catch (err) {
    if (err.response?.status === 401 && req.session.sf.refreshToken) {
      const newToken = await refreshAccessToken(req);
      return await doCall(newToken);
    }
    throw err;
  }
}

function getConfigOrFail(objectName, res) {
  const cfg = objectsConfig[objectName];
  if (!cfg) {
    res.status(400).json({ error: `Unsupported object: ${objectName}` });
    return null;
  }
  return cfg;
}

router.get("/objects", (req, res) => {
  const list = Object.entries(objectsConfig).map(([name, cfg]) => ({
    name,
    label: cfg.label,
    fields: cfg.fields,
    requiredOnCreate: cfg.requiredOnCreate,
  }));
  res.json(list);
});

router.get("/records/:object", async (req, res) => {
  const { object } = req.params;
  const cfg = getConfigOrFail(object, res);
  if (!cfg) return;

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const fieldList = ["Id", ...cfg.fields].join(",");
  const soql = `SELECT ${fieldList} FROM ${object} ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;

  try {
    const response = await sfRequest(req, {
      method: "GET",
      url: `/services/data/${API_VERSION}/query`,
      params: { q: soql },
    });
    res.json({
      records: response.data.records,
      totalSize: response.data.totalSize,
      done: response.data.done,
      hasMore: offset + response.data.records.length < response.data.totalSize,
    });
  } catch (err) {
    handleSfError(err, res);
  }
});

router.post("/records/:object", async (req, res) => {
  const { object } = req.params;
  const cfg = getConfigOrFail(object, res);
  if (!cfg) return;

  try {
    const response = await sfRequest(req, {
      method: "POST",
      url: `/services/data/${API_VERSION}/sobjects/${object}`,
      data: req.body,
      headers: { "Content-Type": "application/json" },
    });
    res.status(201).json(response.data);
  } catch (err) {
    handleSfError(err, res);
  }
});

router.put("/records/:object/:id", async (req, res) => {
  const { object, id } = req.params;
  const cfg = getConfigOrFail(object, res);
  if (!cfg) return;

  try {
    await sfRequest(req, {
      method: "PATCH",
      url: `/services/data/${API_VERSION}/sobjects/${object}/${id}`,
      data: req.body,
      headers: { "Content-Type": "application/json" },
    });
    res.json({ success: true });
  } catch (err) {
    handleSfError(err, res);
  }
});

router.delete("/records/:object/:id", async (req, res) => {
  const { object, id } = req.params;
  const cfg = getConfigOrFail(object, res);
  if (!cfg) return;

  try {
    await sfRequest(req, {
      method: "DELETE",
      url: `/services/data/${API_VERSION}/sobjects/${object}/${id}`,
    });
    res.json({ success: true });
  } catch (err) {
    handleSfError(err, res);
  }
});

function handleSfError(err, res) {
  console.error("Salesforce API error:", err.response?.data || err.message);
  const status = err.response?.status || 500;
  const body = err.response?.data || { message: err.message };
  res.status(status).json({ error: "Salesforce API error", details: body });
}

module.exports = router;
