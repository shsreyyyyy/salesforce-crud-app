import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import RecordForm from "./RecordForm";

const PAGE_SIZE = 20;

export default function RecordTable({ objectMeta }) {
  const [records, setRecords] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const scrollRef = useRef(null);
  const loadingRef = useRef(false); 

  const loadPage = useCallback(
    async (nextOffset, replace = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await api.getRecords(objectMeta.name, nextOffset, PAGE_SIZE);
        setRecords((prev) => (replace ? result.records : [...prev, ...result.records]));
        setOffset(nextOffset + result.records.length);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err.details?.details?.[0]?.message || err.message || "Failed to load records");
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [objectMeta.name]
  );

  useEffect(() => {
    setRecords([]);
    setOffset(0);
    setHasMore(true);
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectMeta.name]);

  // Infinite scroll: load next 20 when the user scrolls near the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || loadingRef.current || !hasMore) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom) {
      loadPage(offset);
    }
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete this ${objectMeta.label} record?`)) return;
    try {
      await api.deleteRecord(objectMeta.name, record.Id);
      setRecords((prev) => prev.filter((r) => r.Id !== record.Id));
    } catch (err) {
      alert(err.details?.details?.[0]?.message || err.message || "Delete failed");
    }
  };

  const handleSave = async (payload) => {
    if (editingRecord) {
      await api.updateRecord(objectMeta.name, editingRecord.Id, payload);
      setRecords((prev) =>
        prev.map((r) => (r.Id === editingRecord.Id ? { ...r, ...payload } : r))
      );
    } else {
      const created = await api.createRecord(objectMeta.name, payload);
      setRecords((prev) => [{ Id: created.id, ...payload }, ...prev]);
    }
    setShowForm(false);
    setEditingRecord(null);
  };

  return (
    <div className="record-table-wrapper">
      <div className="table-header">
        <h2>{objectMeta.label} records</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          + New {objectMeta.label}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll" ref={scrollRef} onScroll={handleScroll}>
        <table>
          <thead>
            <tr>
              {objectMeta.fields.map((f) => (
                <th key={f}>{f}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.Id}>
                {objectMeta.fields.map((f) => (
                  <td key={f}>{formatValue(r[f])}</td>
                ))}
                <td className="actions-cell">
                  <button className="btn btn-small" onClick={() => handleEdit(r)}>
                    Edit
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => handleDelete(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <p className="loading-text">Loading...</p>}
        {!loading && !hasMore && records.length > 0 && (
          <p className="loading-text">No more records.</p>
        )}
        {!loading && records.length === 0 && <p className="loading-text">No records found.</p>}
      </div>

      {showForm && (
        <RecordForm
          objectMeta={objectMeta}
          initialData={editingRecord}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function formatValue(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}
