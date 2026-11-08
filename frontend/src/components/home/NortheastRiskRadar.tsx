"use client";

import { useState } from "react";

interface RiskPoint {
  id: string;
  name: string;
  state: string;
  corridor: string;
  level: "Critical" | "Warning" | "Watch" | "Safe";
  cx: number;
  cy: number;
  description: string;
  rainfall: string;
}

const SAMPLE_POINTS: RiskPoint[] = [
  {
    id: "p1",
    name: "Dima Hasao Pass",
    state: "Assam",
    corridor: "NH-27",
    level: "Critical",
    cx: 260,
    cy: 215,
    description: "High slope creep & saturation detected along hill-cutting section",
    rainfall: "148 mm / 24h",
  },
  {
    id: "p2",
    name: "Sevoke-Teesta Gorge",
    state: "Sikkim Corridor",
    corridor: "NH-10",
    level: "Warning",
    cx: 95,
    cy: 165,
    description: "Riverbank slope toe erosion & active debris flow warning",
    rainfall: "92 mm / 24h",
  },
  {
    id: "p3",
    name: "Kohima-Pfutsero Stretch",
    state: "Nagaland",
    corridor: "NH-29",
    level: "Watch",
    cx: 325,
    cy: 200,
    description: "Soil moisture elevating above baseline; monitor crack expansion",
    rainfall: "64 mm / 24h",
  },
  {
    id: "p4",
    name: "Kamrup Valley Section",
    state: "Assam",
    corridor: "NH-27",
    level: "Safe",
    cx: 185,
    cy: 190,
    description: "Baseline terrain stability nominal; normal highway transit",
    rainfall: "22 mm / 24h",
  },
];

const LEGEND_ITEMS = [
  {
    level: "Critical",
    color: "#DC2626",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    textColor: "text-red-400",
    detail: "Immediate action required",
  },
  {
    level: "Warning",
    color: "#EA580C",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/40",
    textColor: "text-orange-400",
    detail: "High probability event",
  },
  {
    level: "Watch",
    color: "#D97706",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-400",
    detail: "Elevated monitoring",
  },
  {
    level: "Safe",
    color: "#16A34A",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-400",
    detail: "Normal road conditions",
  },
];

export default function NortheastRiskRadar() {
  const [activePoint, setActivePoint] = useState<RiskPoint | null>(SAMPLE_POINTS[0]);

  const getColorByLevel = (level: RiskPoint["level"]) => {
    switch (level) {
      case "Critical":
        return "#DC2626";
      case "Warning":
        return "#EA580C";
      case "Watch":
        return "#D97706";
      case "Safe":
        return "#16A34A";
    }
  };

  return (
    <div className="w-full bg-[#0E2821]/85 backdrop-blur-md border border-[#DCE8D4]/25 rounded-2xl md:rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between text-[#F6F4EC]">
      {/* Subtle topographic grid background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#DCE8D4 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
        aria-hidden="true"
      />

      {/* Header bar of the radar console */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-[#DCE8D4]/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D] animate-ping" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#D6A65D] font-semibold">
              SAR Radar Scanner • NE Sector
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#F6F4EC] tracking-tight mt-0.5">
            Northeast India Risk Map
          </h3>
        </div>

        {/* Prototype indicator */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#DCE8D4]/15 text-[#DCE8D4] border border-[#DCE8D4]/25 whitespace-nowrap">
          Placeholder Preview
        </span>
      </div>

      {/* Main Radar Screen (SVG) */}
      <div className="relative z-10 my-3 sm:my-4 flex items-center justify-center">
        <div className="relative w-full max-w-[420px] aspect-square rounded-full border border-[#DCE8D4]/20 bg-[#091D17]/90 shadow-inner overflow-hidden flex items-center justify-center">
          {/* Radar Sweep Beam */}
          <div
            className="absolute inset-0 pointer-events-none animate-radar-sweep opacity-40"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, rgba(214,166,93,0.35) 0deg, rgba(220,232,212,0.1) 45deg, transparent 75deg)",
            }}
            aria-hidden="true"
          />

          <svg
            viewBox="0 0 400 400"
            className="w-full h-full relative z-10"
            role="img"
            aria-label="Northeast India radar risk simulation map showing major national highway corridors and risk points"
          >
            <defs>
              {/* Radial gradient for map glow */}
              <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#DCE8D4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#173D32" stopOpacity="0" />
              </radialGradient>

              {/* Marker glow filters */}
              <filter id="glowCritical" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#DC2626" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Radar Center Glow */}
            <circle cx="200" cy="200" r="195" fill="url(#radarCenterGlow)" />

            {/* Concentric Radar Distance Rings */}
            <circle
              cx="200"
              cy="200"
              r="50"
              fill="none"
              stroke="#DCE8D4"
              strokeOpacity="0.18"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx="200"
              cy="200"
              r="100"
              fill="none"
              stroke="#DCE8D4"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
            <circle
              cx="200"
              cy="200"
              r="150"
              fill="none"
              stroke="#DCE8D4"
              strokeOpacity="0.18"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle
              cx="200"
              cy="200"
              r="195"
              fill="none"
              stroke="#DCE8D4"
              strokeOpacity="0.3"
              strokeWidth="1.5"
            />

            {/* Crosshair Axes */}
            <line
              x1="200"
              y1="5"
              x2="200"
              y2="395"
              stroke="#DCE8D4"
              strokeOpacity="0.15"
              strokeWidth="1"
            />
            <line
              x1="5"
              y1="200"
              x2="395"
              y2="200"
              stroke="#DCE8D4"
              strokeOpacity="0.15"
              strokeWidth="1"
            />

            {/* Cardinal Direction Indicators */}
            <text x="200" y="24" fill="#DCE8D4" opacity="0.6" fontSize="10" textAnchor="middle" fontFamily="monospace">N</text>
            <text x="382" y="204" fill="#DCE8D4" opacity="0.6" fontSize="10" textAnchor="middle" fontFamily="monospace">E</text>
            <text x="200" y="386" fill="#DCE8D4" opacity="0.6" fontSize="10" textAnchor="middle" fontFamily="monospace">S</text>
            <text x="18" y="204" fill="#DCE8D4" opacity="0.6" fontSize="10" textAnchor="middle" fontFamily="monospace">W</text>

            {/* Range markers */}
            <text x="205" y="148" fill="#D6A65D" opacity="0.6" fontSize="8" fontFamily="monospace">50km</text>
            <text x="205" y="98" fill="#D6A65D" opacity="0.6" fontSize="8" fontFamily="monospace">100km</text>
            <text x="205" y="48" fill="#D6A65D" opacity="0.6" fontSize="8" fontFamily="monospace">150km</text>

            {/* Northeast India Stylized Terrain & State Silhouettes */}
            <g opacity="0.35" stroke="#DCE8D4" strokeWidth="1" fill="none">
              {/* Brahmaputra river valley contour */}
              <path
                d="M 120 180 Q 180 170 230 160 T 310 130 T 360 110"
                stroke="#DCE8D4"
                strokeWidth="1.75"
                strokeOpacity="0.5"
                strokeDasharray="2 3"
              />

              {/* Eastern Himalayas / Arunachal ridge */}
              <path
                d="M 140 130 C 180 90, 260 70, 340 75 C 365 77, 375 100, 360 135"
                strokeWidth="1.25"
                strokeOpacity="0.4"
              />

              {/* Meghalaya Plateau contour */}
              <path
                d="M 160 215 C 170 205, 220 205, 240 220 C 235 240, 185 240, 160 215 Z"
                fill="#DCE8D4"
                fillOpacity="0.06"
                strokeOpacity="0.4"
              />

              {/* Barail & Patkai hill ridges (Nagaland, Manipur, Mizoram) */}
              <path
                d="M 280 150 C 310 170, 345 190, 340 230 C 335 260, 315 290, 300 320"
                strokeWidth="1.25"
                strokeOpacity="0.35"
              />
              <path
                d="M 240 230 C 270 240, 290 260, 280 300 C 270 330, 260 340, 255 350"
                strokeWidth="1.25"
                strokeOpacity="0.35"
              />
            </g>

            {/* National Highway corridors (Major NH lines) */}
            <g strokeLinecap="round" strokeLinejoin="round">
              {/* NH-10 Sikkim corridor */}
              <path
                d="M 75 180 L 95 165 L 110 140"
                stroke="#EA580C"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                opacity="0.8"
              />
              {/* NH-27 Guwahati - Dima Hasao - Silchar corridor */}
              <path
                d="M 150 195 L 185 190 L 225 195 L 260 215 L 275 250"
                stroke="#DC2626"
                strokeWidth="2.75"
                opacity="0.85"
              />
              {/* NH-29 Dimapur - Kohima */}
              <path
                d="M 290 175 L 310 185 L 325 200 L 330 225"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeDasharray="3 2"
                opacity="0.85"
              />
              {/* NH-102 Imphal - Moreh */}
              <path
                d="M 320 250 L 335 270 L 350 295"
                stroke="#16A34A"
                strokeWidth="2"
                opacity="0.7"
              />
            </g>

            {/* Corridor Labels */}
            <text x="65" y="160" fill="#DCE8D4" opacity="0.6" fontSize="8" fontFamily="monospace">NH-10</text>
            <text x="215" y="185" fill="#DCE8D4" opacity="0.75" fontSize="8" fontFamily="monospace" fontWeight="bold">NH-27</text>
            <text x="335" y="195" fill="#DCE8D4" opacity="0.6" fontSize="8" fontFamily="monospace">NH-29</text>

            {/* Interactive Risk Point Nodes */}
            {SAMPLE_POINTS.map((pt) => {
              const isSelected = activePoint?.id === pt.id;
              const color = getColorByLevel(pt.level);

              return (
                <g
                  key={pt.id}
                  className="cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                  onClick={() => setActivePoint(pt)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActivePoint(pt);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${pt.name}, ${pt.level} risk on ${pt.corridor}`}
                >
                  {/* Ping pulse for Critical and Warning */}
                  {(pt.level === "Critical" || pt.level === "Warning") && (
                    <circle
                      cx={pt.cx}
                      cy={pt.cy}
                      r={isSelected ? 16 : 12}
                      fill={color}
                      opacity="0.3"
                      className="animate-radar-pulse"
                    />
                  )}

                  {/* Outer selection ring */}
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={isSelected ? 9 : 6}
                    fill="none"
                    stroke={isSelected ? "#F6F4EC" : color}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeOpacity={isSelected ? 1 : 0.8}
                  />

                  {/* Inner solid node dot */}
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={isSelected ? 5 : 3.5}
                    fill={color}
                    filter={pt.level === "Critical" ? "url(#glowCritical)" : undefined}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Point Callout Card */}
      {activePoint && (
        <div className="relative z-10 bg-[#173D32]/90 border border-[#DCE8D4]/25 rounded-xl p-3 my-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getColorByLevel(activePoint.level) }}
              />
              <span className="text-[#F6F4EC] text-sm">{activePoint.name}</span>
              <span className="text-[#D6A65D] font-mono text-[11px]">({activePoint.corridor})</span>
            </div>
            <span
              className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]"
              style={{
                backgroundColor: `${getColorByLevel(activePoint.level)}25`,
                color: getColorByLevel(activePoint.level),
                border: `1px solid ${getColorByLevel(activePoint.level)}60`,
              }}
            >
              {activePoint.level}
            </span>
          </div>
          <p className="text-[#DCE8D4]/85 text-[11px] leading-relaxed mt-1">
            {activePoint.description}
          </p>
          <div className="flex items-center justify-between text-[10px] text-[#DCE8D4]/60 font-mono mt-1.5 pt-1.5 border-t border-[#DCE8D4]/10">
            <span>State: {activePoint.state}</span>
            <span>Precipitation: {activePoint.rainfall}</span>
          </div>
        </div>
      )}

      {/* Risk Legend (Required: Critical, Warning, Watch, Safe) */}
      <div className="relative z-10 border-t border-[#DCE8D4]/15 pt-3">
        <div className="flex items-center justify-between text-[11px] font-medium text-[#DCE8D4]/80 mb-2">
          <span>Risk Level Classification</span>
          <span className="text-[10px] text-[#DCE8D4]/50 font-mono">4-Tier Model</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.level}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${item.borderColor} ${item.bgColor} backdrop-blur-xs`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold leading-tight ${item.textColor}`}>
                  {item.level}
                </span>
                <span className="text-[9px] text-[#DCE8D4]/70 truncate">
                  {item.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Independent component disclaimer */}
      <div className="relative z-10 mt-3 pt-2 text-[10px] text-[#DCE8D4]/60 text-center border-t border-[#DCE8D4]/10 font-mono">
        Prototype visualizer. Real GIS layer (MapLibre / Leaflet) will bind to SAR & IMD APIs.
      </div>
    </div>
  );
}

