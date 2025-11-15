import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CampusMap from "../components/CampusMap";
import "./guest.css";

export default function GuestPage() {
  const [viewMode, setViewMode] = useState("2D");
  const [level, setLevel] = useState("1");

  const [showFromOptions, setShowFromOptions] = useState(false);
  const [showToOptions, setShowToOptions] = useState(false);

  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);

  const [showMapsModal, setShowMapsModal] = useState(false);

  const openGoogleMapsModal = () => setShowMapsModal(true);
  const closeGoogleMapsModal = () => setShowMapsModal(false);

  /* ---------------- GOOGLE MAPS SCRIPT LOADING ---------------- */
  useEffect(() => {
    if (!showMapsModal) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => {
      const tm = { lat: 45.7489, lng: 21.2087 };

      const map = new window.google.maps.Map(
        document.getElementById("googleMapContainer"),
        {
          center: tm,
          zoom: 13,
        }
      );

      /* CLICK ON MAP TO SET FROM LOCATION */
      map.addListener("click", (e) => {
        const coords = e.latLng.toJSON();

        setFromLocation({
          type: "external",
          name: "Custom Location",
          lat: coords.lat,
          lng: coords.lng,
        });

        closeGoogleMapsModal();
      });

      /* SEARCH BAR */
      const input = document.getElementById("mapsSearchInput");
      const searchBox = new window.google.maps.places.SearchBox(input);

      searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) return;

        const place = places[0];
        if (!place.geometry) return;

        const coords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setFromLocation({
          type: "external",
          name: place.formatted_address || place.name,
          lat: coords.lat,
          lng: coords.lng,
        });

        closeGoogleMapsModal();
      });
    };

    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [showMapsModal]);

  /* ============================================================
     COMPONENT RENDER
     ============================================================ */

  return (
    <div className="guest-container">

      {/* SIDEBAR */}
      <div className="guest-sidebar">
        <div className="guest-header">
          <div className="guest-logo">📍</div>
          <span className="guest-title">MapItUP</span>
        </div>

        <h2 className="guest-section-title">Plan Your Route</h2>
        <p className="guest-section-subtitle">
          Select your starting point and destination on the map
        </p>

        {/* ---------------- FROM LOCATION ---------------- */}
        <div className="guest-input-group">
          <label className="guest-label">From Location</label>

          {fromLocation ? (
            <div className="selected-location selected-green">
              <div className="loc-left">
                <span className="loc-icon">📌</span>
                <span className="loc-title">{fromLocation.name}</span>
              </div>

              <button
                className="change-btn"
                onClick={() => setShowFromOptions(true)}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              className="guest-input-btn"
              onClick={() => setShowFromOptions(!showFromOptions)}
            >
              <span className="guest-input-icon">📍</span> Choose Location
            </button>
          )}

          {showFromOptions && (
            <div className="guest-dropdown">
              <button
                className="guest-drop-btn"
                onClick={() => {
                  openGoogleMapsModal();
                  setShowFromOptions(false);
                }}
              >
                🌍 External Location
                <span className="guest-drop-sub">Select from Google Maps</span>
              </button>

              <button
                className="guest-drop-btn"
                onClick={() => {
                  setFromLocation(null);
                  setShowFromOptions(false);
                }}
              >
                🏫 Campus Building
                <span className="guest-drop-sub">
                  Pick from the 2D campus map
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ---------------- TO DESTINATION ---------------- */}
        <div className="guest-input-group">
          <label className="guest-label">To Destination</label>

          {toLocation ? (
            <div className="selected-location selected-red">
              <div className="loc-left">
                <span className="loc-icon">🎯</span>
                <span className="loc-title">{toLocation.name}</span>
              </div>

              <button
                className="change-btn"
                onClick={() => setShowToOptions(true)}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              className="guest-input-btn"
              onClick={() => setShowToOptions(!showToOptions)}
            >
              <span className="guest-input-icon">📍</span> Choose Location
            </button>
          )}

          {showToOptions && (
            <div className="guest-dropdown">
              <button
                className="guest-drop-btn"
                onClick={() => {
                  setShowToOptions(false);
                }}
              >
                🏫 Select from 2D Campus Map
                <span className="guest-drop-sub">Tap a building</span>
              </button>
            </div>
          )}
        </div>

        {/* FIND ROUTE */}
        <button className="guest-find-btn">Find Route 🔍</button>

        <Link to="/" className="guest-back-link">← Back</Link>
      </div>

      {/* ---------------- MAP AREA ---------------- */}
      <div className="guest-map-area">

        {/* TOP CONTROLS */}
        <div className="guest-map-controls">
          <div className="guest-levels">
            {["G", "1", "2"].map((lvl) => (
              <button
                key={lvl}
                className={`guest-level-btn ${level === lvl ? "active" : ""}`}
                onClick={() => setLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="guest-view-toggle">
            <button
              className={`guest-toggle-btn ${viewMode === "2D" ? "active" : ""}`}
              onClick={() => setViewMode("2D")}
            >
              2D
            </button>
            <button
              className={`guest-toggle-btn ${viewMode === "3D" ? "active" : ""}`}
              onClick={() => setViewMode("3D")}
            >
              3D
            </button>
          </div>
        </div>

        {/* CAMPUS SVG */}
        <div className="guest-map-placeholder">
          <CampusMap
            onSelect={(locationName) =>
              setToLocation({
                type: "campus",
                name: locationName,
              })
            }
          />
        </div>
      </div>

      {/* ---------------- GOOGLE MAPS MODAL ---------------- */}
      {showMapsModal && (
        <div className="maps-modal-backdrop">
          <div className="maps-modal">
            <div className="maps-header">
              <h2>Select Starting Location</h2>
              <button className="maps-close-btn" onClick={closeGoogleMapsModal}>
                Close
              </button>
            </div>

            <input
              id="mapsSearchInput"
              type="text"
              placeholder="Search location in Timișoara..."
              className="maps-search-input"
            />

            <div id="googleMapContainer" className="maps-map"></div>
          </div>
        </div>
      )}
    </div>
  );
}
