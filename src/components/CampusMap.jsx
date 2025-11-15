import { useEffect } from "react";
import testMap from "../assets/campus-test.svg";

export default function CampusMap({ onSelect }) {
  useEffect(() => {
    const svg = document.getElementById("campus-svg");
    if (!svg) return;

    svg.addEventListener("click", (e) => {
      const id = e.target.id;

      if (id === "library" || id === "library-text") onSelect("Library");
      if (id === "eng" || id === "eng-text") onSelect("Eng. Building");
      if (id === "student" || id === "student-text") onSelect("Student Center");
      if (id === "admin" || id === "admin-text") onSelect("Admin Office");
    });
  }, []);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <img
        id="campus-svg"
        src={testMap}
        alt="Campus Map"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          cursor: "pointer",
        }}
      />
    </div>
  );
}
