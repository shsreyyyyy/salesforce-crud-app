import React, { useEffect, useState } from "react";
import { api } from "./api";
import Login from "./components/Login";
import ObjectSelector from "./components/ObjectSelector";
import RecordTable from "./components/RecordTable";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      setAuthError(params.get("auth_error"));
      window.history.replaceState({}, "", "/");
    }

    api
      .authStatus()
      .then((status) => {
        setLoggedIn(status.loggedIn);
        if (status.loggedIn) return api.getObjects();
        return null;
      })
      .then((objs) => {
        if (objs) setObjects(objs);
      })
      .finally(() => setLoading(false));

    if (params.get("logged_in")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setLoggedIn(false);
    setObjects([]);
    setSelectedObject(null);
  };

  if (loading) {
    return <div className="center-screen">Loading...</div>;
  }

  if (!loggedIn) {
    return (
      <>
        {authError && <p className="form-error center-screen">Login failed: {authError}</p>}
        <Login />
      </>
    );
  }

  const selectedMeta = objects.find((o) => o.name === selectedObject);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Salesforce CRUD App</h1>
        <button className="btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main>
        <ObjectSelector objects={objects} selected={selectedObject} onChange={setSelectedObject} />
        {selectedMeta ? (
          <RecordTable objectMeta={selectedMeta} />
        ) : (
          <p className="hint-text">Choose an object above to view its records.</p>
        )}
      </main>
    </div>
  );
}
