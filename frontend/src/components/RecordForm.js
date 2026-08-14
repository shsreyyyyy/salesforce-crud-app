import React, { useState } from "react";

export default function RecordForm({ objectMeta, initialData, onCancel, onSave }) {
  const isEdit = Boolean(initialData?.Id);
  const [values, setValues] = useState(() => {
    const v = {};
    objectMeta.fields.forEach((f) => {
      v[f] = initialData?.[f] ?? "";
    });
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const inputTypeFor = (field) => {
    if (field === "CloseDate") return "date";
    if (["Amount", "AnnualRevenue", "Probability"].includes(field)) return "number";
    if (field === "Email") return "email";
    return "text";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {};
    Object.entries(values).forEach(([k, v]) => {
      if (v !== "") payload[k] = v;
    });

    const missing = objectMeta.requiredOnCreate.filter((f) => !isEdit && !payload[f]);
    if (missing.length) {
      setError(`Required field(s) missing: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.details?.details?.[0]?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>
          {isEdit ? "Edit" : "New"} {objectMeta.label}
        </h2>
        <form onSubmit={handleSubmit}>
          {objectMeta.fields.map((field) => (
            <div className="form-row" key={field}>
              <label>
                {field}
                {objectMeta.requiredOnCreate.includes(field) && !isEdit ? " *" : ""}
              </label>
              {field === "Description" ? (
                <textarea
                  value={values[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                  rows={3}
                />
              ) : (
                <input
                  type={inputTypeFor(field)}
                  value={values[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              )}
            </div>
          ))}

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
