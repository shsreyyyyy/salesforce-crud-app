import React from "react";

export default function ObjectSelector({ objects, selected, onChange }) {
  return (
    <div className="object-selector">
      <label htmlFor="object-select">Object:</label>
      <select
        id="object-select"
        value={selected || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          -- Select an object --
        </option>
        {objects.map((o) => (
          <option key={o.name} value={o.name}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
