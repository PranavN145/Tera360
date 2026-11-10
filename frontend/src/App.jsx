"use client";

import React from "react";
import RiskMap from "./components/RiskMap";

/**
 * Main Interface Full-Screen Risk Dashboard Entry point
 */
export default function App() {
  return (
    <main className="w-screen h-screen relative overflow-hidden" style={{ width: "100vw", height: "100vh" }}>
      <RiskMap />
    </main>
  );
}

