// src/pages/AdminPage.jsx
import React, { useState } from "react";

import "./AdminPage.css";

const AdminPage = () => {
  const [showForm, setShowForm] = useState(true);


  const [roomName, setRoomName] = useState("");
  const [floor, setFloor] = useState("0");
  const [adjacentRooms, setAdjacentRooms] = useState("");

  const [laz2D, setLaz2D] = useState(null);

  const [add3D, setAdd3D] = useState(false);
  const [laz3D, setLaz3D] = useState(null);
  const [model3D, setModel3D] = useState(null);

  const handleAddClick = () => {
    setShowForm(true);
  };

  const handleToggle3D = () => {
    setAdd3D((prev) => {
      const next = !prev;
      if (!next) {
        // dacă debifezi, golește valorile din state
        setLaz3D(null);
        setModel3D(null);
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!roomName.trim() || floor === "" || !laz2D) {
      alert("Numele camerei, etajul și fișierul .laz 2D sunt obligatorii.");
      return;
    }

    console.log("=== New room ===");
    console.log("Room name:", roomName);
    console.log("Floor:", floor);
    console.log("Adjacent rooms (raw):", adjacentRooms);
    console.log(
      "Adjacent rooms (parsed):",
      adjacentRooms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    console.log("2D .laz:", laz2D);

    if (add3D) {
      console.log("3D activat");
      console.log("3D .laz:", laz3D);
      console.log("3D model (.glb):", model3D);
    } else {
      console.log("3D dezactivat");
    }

    alert("Camera a fost adăugată (simulare, fără backend încă).");

    setRoomName("");
    setFloor("0");
    setAdjacentRooms("");
    setLaz2D(null);
    setAdd3D(false);
    setLaz3D(null);
    setModel3D(null);
    e.target.reset();
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${showForm ? "active" : ""}`}
          onClick={handleAddClick}
        >
          Adaugă cameră
        </button>
        <button className="tab-btn disabled" disabled>
          Editează cameră
        </button>
        <button className="tab-btn disabled" disabled>
          Șterge cameră
        </button>
      </div>

      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <h2 className="card-title">Adaugă o cameră</h2>

          <p className="card-subtitle">
            Completează metadatele camerei și încarcă fișierele necesare
            pentru 2D și, opțional, pentru 3D.
          </p>

          {/* Informații generale */}
          <div className="section">
            <h3 className="section-title">Informații generale</h3>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Nume cameră <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="ex: A101, Sala Laborator 3"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Etaj <span className="required">*</span>
                </label>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  min={-5}
                  max={50}
                  step={1}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Camere adiacente (separate prin virgulă)</label>
              <input
                type="text"
                value={adjacentRooms}
                onChange={(e) => setAdjacentRooms(e.target.value)}
                placeholder="ex: A102, A103, Hol_principal"
              />
              <small className="help-text">
                Se folosesc pentru graf de navigație (Dijkstra etc.).
              </small>
            </div>
          </div>

          {/* Fișiere cameră */}
          <div className="section">
            <h3 className="section-title">Fișiere cameră</h3>

            <div className="form-group">
              <label>
                .laz pentru 2D <span className="required">*</span>
              </label>
              <input
                type="file"
                accept=".laz"
                onChange={(e) => setLaz2D(e.target.files[0] || null)}
                required
              />
              <small className="help-text">
                Fișierul folosit pentru generarea conturului 2D al camerei.
              </small>
            </div>

            {/* Toggle 3D */}
            <div className="form-group toggle-3d">
              <label className="toggle-3d-label">
                <input
                  type="checkbox"
                  checked={add3D}
                  onChange={handleToggle3D}
                />
                <span>Add 3D</span>
              </label>
              <small className="help-text">
                Bifează dacă vrei să încarci și fișiere pentru vizualizarea 3D.
              </small>
            </div>

            {/* Câmpuri 3D (active doar dacă Add 3D este bifat) */}
            <div className="form-group">
              <label>.laz pentru 3D</label>
              <input
                type="file"
                accept=".laz"
                disabled={!add3D}
                className={!add3D ? "input-disabled" : ""}
                onChange={(e) => setLaz3D(e.target.files[0] || null)}
              />
            </div>

            <div className="form-group">
              <label>3D Model (.glb)</label>
              <input
                type="file"
                accept=".glb"
                disabled={!add3D}
                className={!add3D ? "input-disabled" : ""}
                onChange={(e) => setModel3D(e.target.files[0] || null)}
              />
            </div>
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
