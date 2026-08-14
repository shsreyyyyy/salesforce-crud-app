const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let details;
    try {
      details = await res.json();
    } catch {
      details = { error: res.statusText };
    }
    const err = new Error(details.error || "Request failed");
    err.details = details;
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  backendUrl: BASE_URL,
  authStatus: () => request("/auth/status"),
  logout: () => request("/auth/logout", { method: "POST" }),
  getObjects: () => request("/api/objects"),
  getRecords: (object, offset, limit = 20) =>
    request(`/api/records/${object}?offset=${offset}&limit=${limit}`),
  createRecord: (object, data) =>
    request(`/api/records/${object}`, { method: "POST", body: JSON.stringify(data) }),
  updateRecord: (object, id, data) =>
    request(`/api/records/${object}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRecord: (object, id) =>
    request(`/api/records/${object}/${id}`, { method: "DELETE" }),
};
