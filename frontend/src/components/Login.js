import React from "react";
import { api } from "../api";

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${api.backendUrl}/auth/login`;
  };

  return (
    <div className="login-screen">
      <h1>Salesforce CRUD App</h1>
      <p>Manage Accounts, Contacts, Leads, Opportunities and Cases without the Salesforce UI.</p>
      <button className="btn btn-primary" onClick={handleLogin}>
        Log in with Salesforce
      </button>
    </div>
  );
}
