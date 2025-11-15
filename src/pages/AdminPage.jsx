// src/pages/AdminPage.jsx
import React, { useState } from "react";
import "./AdminPage.css"; // IMPORTANT: stilurile sunt aici

const AdminPage = () => {
  const [showForm, setShowForm] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [laz2D, setLaz2D] = useState(null);
  const [laz3D, setLaz3D] = useState(null);

  const handleAddClick = () => {
    setShowForm((prev) => !prev);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!laz2D || !roomName.trim()) {
      alert("Fișierul .laz 2D și numele camerei sunt obligatorii.");
      return;
    }

    console.log("=== New room ===");
    console.log("Room name:", roomName);
    console.log("2D .laz:", laz2D);
    console.log("3D .laz:", laz3D);

    alert("Camera a fost adăugată (simulare).");

    setRoomName("");
    setLaz2D(null);
    setLaz3D(null);
    e.target.reset();
    setShowForm(false);
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="admin-buttons">
        <button className="btn primary" onClick={handleAddClick}>
          Adaugă cameră
        </button>
        <button className="btn disabled" disabled>
          Editează cameră
        </button>
        <button className="btn disabled" disabled>
          Șterge cameră
        </button>
      </div>

      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <h2>Adaugă o cameră</h2>

          <div className="form-group">
            <label>Nume cameră *</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>.laz pentru 2D *</label>
            <input
              type="file"
              accept=".laz"
              onChange={(e) => setLaz2D(e.target.files[0] || null)}
              required
            />
          </div>

          <div className="form-group">
            <label>.laz pentru 3D (opțional)</label>
            <input
              type="file"
              accept=".laz"
              onChange={(e) => setLaz3D(e.target.files[0] || null)}
            />
          </div>

          <button type="submit" className="btn primary submit">
            Salvează camera
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminPage;
