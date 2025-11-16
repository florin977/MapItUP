import React from "react";

const ChooseFloorPage: React.FC<{
  onBack: () => void;
  onChooseFloor: (floor: "ground" | "first" | "second") => void;
}> = ({ onBack, onChooseFloor }) => {

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black p-10">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 tracking-tight mb-10">
        Choose Floor for Upload
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-5xl">

        <button
          onClick={() => onChooseFloor("ground")}
          className="group relative p-8 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl text-white font-extrabold text-xl hover:scale-105 transition"
        >
          Ground Floor
        </button>

        <button
          onClick={() => onChooseFloor("first")}
          className="group relative p-8 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl text-white font-extrabold text-xl hover:scale-105 transition"
        >
          First Floor
        </button>

        <button
          onClick={() => onChooseFloor("second")}
          className="group relative p-8 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-xl text-white font-extrabold text-xl hover:scale-105 transition"
        >
          Second Floor
        </button>

      </div>

      <button
        onClick={onBack}
        className="mt-16 px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold text-lg shadow-lg hover:bg-slate-700 transition"
      >
        ← Back to Admin
      </button>
    </div>
  );
};

export default ChooseFloorPage;
