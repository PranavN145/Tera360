/**
 * mockLandslideData.js
 * High-fidelity GIS telemetry data for Northeast India Landslide Corridors.
 */

export const STATE_PRESETS = {
  'All States': { center: [92.93, 25.80], zoom: 7.2, pitch: 45, bearing: -10 },
  'Nagaland': { center: [94.02, 25.72], zoom: 13.5, pitch: 60, bearing: -20 },
  'Sikkim': { center: [88.52, 27.20], zoom: 12.8, pitch: 62, bearing: -15 },
  'Assam': { center: [92.95, 25.18], zoom: 12.5, pitch: 58, bearing: -25 },
  'Meghalaya': { center: [91.89, 25.57], zoom: 12.5, pitch: 55, bearing: -10 },
  'Arunachal': { center: [93.60, 27.10], zoom: 12.0, pitch: 60, bearing: -20 },
  'Arunachal Pradesh': { center: [93.60, 27.10], zoom: 12.0, pitch: 60, bearing: -20 },
  'Manipur': { center: [93.93, 24.81], zoom: 12.5, pitch: 55, bearing: -15 },
  'Mizoram': { center: [92.71, 23.72], zoom: 12.5, pitch: 58, bearing: -20 },
  'Tripura': { center: [91.98, 23.83], zoom: 12.0, pitch: 50, bearing: -10 },
};

export const corridorRoutes = {
  type: 'FeatureCollection',
  features: [
    // ── Nagaland: NH-29 Dimapur – Kohima Corridor ────────────────
    {
      type: 'Feature',
      id: 1,
      properties: {
        id: 'nh29-seg-1',
        name: 'NH-29 Dimapur – Chumukedima Stretch',
        segment_name: 'NH-29 Dimapur – Chumukedima Stretch',
        state: 'Nagaland',
        corridor: 'NH-29',
        status: 'safe',
        riskStatus: 'Safe',
        soil_moisture_pct: 24,
        soilMoisture: '24% (Optimal)',
        soil_moisture: '24%',
        pore_water_pressure_kpa: 12.4,
        poreWaterPressure: '12.4 kPa (Nominal)',
        pore_water_pressure: '12.4 kPa',
        tilt_rate_mm_h: 0.001,
        tiltRate: '0.02 mm/day (Stable)',
        tilt_rate: '0.02 mm/day',
        elevation: '310m',
        stretchLength: '12.4 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [93.88, 25.78],
          [93.92, 25.76],
          [93.96, 25.74],
          [93.99, 25.73],
          [94.01, 25.725],
        ],
      },
    },
    {
      type: 'Feature',
      id: 2,
      properties: {
        id: 'nh29-seg-2',
        name: 'NH-29 Pherima Slide Cut (Approach Zone)',
        segment_name: 'NH-29 Pherima Slide Cut (Approach Zone)',
        state: 'Nagaland',
        corridor: 'NH-29',
        status: 'warning',
        riskStatus: 'Warning',
        soil_moisture_pct: 76,
        soilMoisture: '76% (High Saturation)',
        soil_moisture: '76%',
        pore_water_pressure_kpa: 185,
        poreWaterPressure: '185 kPa',
        pore_water_pressure: '185 kPa',
        tilt_rate_mm_h: 0.22,
        tiltRate: '0.22 mm/h (Movement Detected)',
        tilt_rate: '0.22 mm/h',
        elevation: '890m',
        stretchLength: '8.6 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [94.01, 25.725],
          [94.02, 25.72],
          [94.03, 25.712],
          [94.038, 25.705],
        ],
      },
    },
    {
      type: 'Feature',
      id: 3,
      properties: {
        id: 'nh29-seg-3',
        name: 'NH-29 Pherima Slide Cut',
        segment_name: 'NH-29 Pherima Slide Cut',
        state: 'Nagaland',
        corridor: 'NH-29',
        status: 'critical',
        riskStatus: 'Critical',
        soil_moisture_pct: 84,
        soilMoisture: '84% (Extreme Saturation)',
        soil_moisture: '84%',
        pore_water_pressure_kpa: 210,
        poreWaterPressure: '210 kPa',
        pore_water_pressure: '210 kPa',
        tilt_rate_mm_h: 0.28,
        tiltRate: '0.28 mm/h (Movement Detected)',
        tilt_rate: '0.28 mm/h',
        elevation: '1,240m',
        stretchLength: '6.2 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [94.038, 25.705],
          [94.045, 25.698],
          [94.055, 25.688],
          [94.065, 25.678],
          [94.08, 25.668],
        ],
      },
    },

    // ── Sikkim: NH-10 Sevoke – Teesta Gorge Corridor ──────────────
    {
      type: 'Feature',
      id: 4,
      properties: {
        id: 'nh10-seg-1',
        name: 'NH-10 Teesta Low Dam – 29th Mile Zone',
        segment_name: 'NH-10 Teesta Low Dam – 29th Mile Zone',
        state: 'Sikkim',
        corridor: 'NH-10',
        status: 'critical',
        riskStatus: 'Critical',
        soil_moisture_pct: 91,
        soilMoisture: '91% (Waterlogged)',
        soil_moisture: '91%',
        pore_water_pressure_kpa: 82.5,
        poreWaterPressure: '82.5 kPa (Extremely High)',
        pore_water_pressure: '82.5 kPa',
        tilt_rate_mm_h: 0.21,
        tiltRate: '5.10 mm/day (Rockfall Hazard)',
        tilt_rate: '5.10 mm/day',
        elevation: '280m',
        stretchLength: '14.2 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [88.48, 27.12],
          [88.50, 27.16],
          [88.52, 27.20],
          [88.54, 27.23],
          [88.56, 27.27],
        ],
      },
    },
    {
      type: 'Feature',
      id: 5,
      properties: {
        id: 'nh10-seg-2',
        name: 'NH-10 Rangpo – Singtam Approach',
        segment_name: 'NH-10 Rangpo – Singtam Approach',
        state: 'Sikkim',
        corridor: 'NH-10',
        status: 'warning',
        riskStatus: 'Warning',
        soil_moisture_pct: 72,
        soilMoisture: '72% (Saturated)',
        soil_moisture: '72%',
        pore_water_pressure_kpa: 48.0,
        poreWaterPressure: '48.0 kPa',
        pore_water_pressure: '48.0 kPa',
        tilt_rate_mm_h: 0.075,
        tiltRate: '1.80 mm/day',
        tilt_rate: '1.80 mm/day',
        elevation: '420m',
        stretchLength: '11.0 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [88.56, 27.27],
          [88.58, 27.30],
          [88.60, 27.32],
          [88.62, 27.33],
        ],
      },
    },
    // ── Assam: NH-27 Dima Hasao Hill-Cutting Corridor ────────────
    {
      type: 'Feature',
      id: 6,
      properties: {
        id: 'nh27-seg-1',
        name: 'NH-27 Jatinga Valley Hill-Cutting Section',
        segment_name: 'NH-27 Jatinga Valley Hill-Cutting Section',
        state: 'Assam',
        corridor: 'NH-27',
        status: 'critical',
        riskStatus: 'Critical',
        soil_moisture_pct: 86,
        soilMoisture: '86% (Critical Hydrostatic Load)',
        soil_moisture: '86%',
        pore_water_pressure_kpa: 71.0,
        poreWaterPressure: '71.0 kPa',
        pore_water_pressure: '71.0 kPa',
        tilt_rate_mm_h: 0.16,
        tiltRate: '3.90 mm/day (Slope Subsidence)',
        tilt_rate: '3.90 mm/day',
        elevation: '610m',
        stretchLength: '18.5 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [92.88, 25.12],
          [92.91, 25.15],
          [92.95, 25.18],
          [92.99, 25.21],
          [93.03, 25.23],
        ],
      },
    },
    // ── Meghalaya: NH-6 Shillong – Jowai Corridor ────────────────
    {
      type: 'Feature',
      id: 7,
      properties: {
        id: 'nh6-seg-1',
        name: 'NH-6 Umkiang – Sonapur Tunnel Section',
        segment_name: 'NH-6 Umkiang – Sonapur Tunnel Section',
        state: 'Meghalaya',
        corridor: 'NH-6',
        status: 'warning',
        riskStatus: 'Warning',
        soil_moisture_pct: 75,
        soilMoisture: '75%',
        soil_moisture: '75%',
        pore_water_pressure_kpa: 52.3,
        poreWaterPressure: '52.3 kPa',
        pore_water_pressure: '52.3 kPa',
        tilt_rate_mm_h: 0.088,
        tiltRate: '2.10 mm/day',
        tilt_rate: '2.10 mm/day',
        elevation: '940m',
        stretchLength: '9.8 km',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.82, 25.52],
          [91.86, 25.55],
          [91.89, 25.57],
          [91.93, 25.59],
        ],
      },
    },
  ],
};

export const rescueRoute = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 101,
      properties: {
        id: 'rescue-detour-1',
        name: 'Emergency Relief Corridor (Peducha – Tsiesema Ridge Bypass)',
        corridor: 'Bypass NH-29',
        status: 'detour',
        riskStatus: 'Safe Bypass',
        soilMoisture: '31%',
        poreWaterPressure: '14.1 kPa',
        tiltRate: '0.04 mm/day',
        detourNote: 'Designated alternate path for NDRF rescue convoys and emergency transit bypassing Dzüdza slide.',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [94.01, 25.725],
          [94.005, 25.742],
          [94.022, 25.751],
          [94.048, 25.742],
          [94.072, 25.718],
          [94.08, 25.668],
        ],
      },
    },
    {
      type: 'Feature',
      id: 102,
      properties: {
        id: 'rescue-detour-2',
        name: 'Sevoke – Mungpoo – Reshi Emergency Ridge Route',
        corridor: 'NH-10 Alternate',
        status: 'detour',
        riskStatus: 'Safe Bypass',
        soilMoisture: '38%',
        poreWaterPressure: '19.4 kPa',
        tiltRate: '0.06 mm/day',
        detourNote: 'Emergency light-vehicle link connecting Siliguri to Sikkim via Mungpoo during high-water alerts.',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [88.48, 27.12],
          [88.46, 27.18],
          [88.50, 27.24],
          [88.56, 27.27],
        ],
      },
    },
  ],
};

/**
 * Computes simulated dynamic geotechnical telemetry across corridor routes for hour 00:00 to 24:00.
 * At peak rainfall (hour 14:00), pore-water pressure exceeds 200 kPa triggering critical alert (#FF0000).
 */
export function computeSimulatedCorridorRoutes(hour = 14) {
  const peakHour = 14;
  const intensity = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(3.5, 2)));

  const updatedFeatures = corridorRoutes.features.map((feat) => {
    const origProps = feat.properties || {};
    const id = origProps.id || "";

    let baseMoisture = 28;
    let basePore = 45;
    let baseTilt = 0.01;

    let peakMoistureAdd = 30;
    let peakPoreAdd = 80;
    let peakTiltAdd = 0.08;

    if (id === "nh29-seg-3") {
      // High-vulnerability target segment: NH-29 Pherima Slide Cut
      baseMoisture = 38;
      basePore = 75;
      baseTilt = 0.02;
      peakMoistureAdd = 46; // Reaches 84% at hour 14
      peakPoreAdd = 135;   // Reaches 210 kPa at hour 14 (> 200 kPa threshold!)
      peakTiltAdd = 0.26;  // Reaches 0.28 mm/h at hour 14
    } else if (id === "nh29-seg-2") {
      // Approach zone: warning at peak
      baseMoisture = 32;
      basePore = 55;
      baseTilt = 0.01;
      peakMoistureAdd = 44; // Reaches 76% at hour 14
      peakPoreAdd = 130;   // Reaches 185 kPa at hour 14
      peakTiltAdd = 0.21;  // Reaches 0.22 mm/h at hour 14
    } else if (id === "nh10-seg-1" || id === "nh27-seg-1") {
      baseMoisture = 42;
      basePore = 35;
      baseTilt = 0.04;
      peakMoistureAdd = 46;
      peakPoreAdd = 170;
      peakTiltAdd = 0.22;
    }

    const currentMoisture = Math.round(baseMoisture + peakMoistureAdd * intensity);
    const currentPore = Math.round((basePore + peakPoreAdd * intensity) * 10) / 10;
    const currentTilt = Math.round((baseTilt + peakTiltAdd * intensity) * 100) / 100;

    let status = "safe";
    let riskStatus = "Safe";
    if (currentPore >= 200) {
      status = "critical";
      riskStatus = "Critical";
    } else if (currentPore >= 150) {
      status = "warning";
      riskStatus = "Warning";
    }

    return {
      ...feat,
      properties: {
        ...origProps,
        soil_moisture_pct: currentMoisture,
        soilMoisture: `${currentMoisture}%`,
        pore_water_pressure_kpa: currentPore,
        poreWaterPressure: `${currentPore} kPa`,
        tilt_rate_mm_h: currentTilt,
        tiltRate: `${currentTilt} mm/h`,
        status,
        riskStatus,
      },
    };
  });

  return {
    ...corridorRoutes,
    features: updatedFeatures,
  };
}

/**
 * Physical Field Sensor Installations along NH-29 Pherima Slope Cut.
 * Includes DAS Fiber Interferometers, Borehole Piezometers, and Tiltmeters.
 */
export const nh29FieldSensors = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "sensor-das-01",
      properties: {
        id: "DAS-NODE-01",
        sensor_id: "DAS-NODE-01",
        name: "DAS Fiber Interferometer 01",
        type: "DAS Fiber Interferometer",
        corridor: "NH-29 Pherima",
        location: "Approach Toe Cut",
        status: "normal", // "normal" | "exceeding"
        strain_microstrain: 48,
        slope_strain: "48 µε",
        strain_threshold: 250,
        status_label: "Normal",
        depth: "Surface Trench (0.5m)",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0135, 25.7242],
      },
    },
    {
      type: "Feature",
      id: "sensor-bp-01",
      properties: {
        id: "BP-PHERIMA-01",
        sensor_id: "BP-PHERIMA-01",
        name: "Borehole Piezometer 01",
        type: "Borehole Piezometer",
        corridor: "NH-29 Pherima",
        location: "Lower Retaining Berm",
        status: "normal",
        strain_microstrain: 65,
        slope_strain: "65 µε",
        strain_threshold: 250,
        status_label: "Normal",
        depth: "18m Cased Borehole",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0178, 25.7218],
      },
    },
    {
      type: "Feature",
      id: "sensor-das-04",
      properties: {
        id: "DAS-NODE-04",
        sensor_id: "DAS-NODE-04",
        name: "DAS Fiber Interferometer 04",
        type: "DAS Fiber Interferometer",
        corridor: "NH-29 Pherima",
        location: "Active Crown Scarp (Main Slip Plane)",
        status: "exceeding",
        strain_microstrain: 580,
        slope_strain: "580 µε (Movement Detected)",
        strain_threshold: 250,
        status_label: "Exceeding Threshold",
        depth: "Continuous Optical Fiber Core",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0202, 25.7201],
      },
    },
    {
      type: "Feature",
      id: "sensor-tm-02",
      properties: {
        id: "TM-SLOPE-02",
        sensor_id: "TM-SLOPE-02",
        name: "Biaxial Surface Tiltmeter 02",
        type: "Biaxial Tiltmeter",
        corridor: "NH-29 Pherima",
        location: "Upper Escarpment Headwall",
        status: "exceeding",
        strain_microstrain: 430,
        slope_strain: "430 µε (Movement Detected)",
        strain_threshold: 250,
        status_label: "Exceeding Threshold",
        depth: "Bedrock Anchor Pin",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0235, 25.7172],
      },
    },
    {
      type: "Feature",
      id: "sensor-bp-02",
      properties: {
        id: "BP-PHERIMA-02",
        sensor_id: "BP-PHERIMA-02",
        name: "Borehole Piezometer 02",
        type: "Borehole Piezometer",
        corridor: "NH-29 Pherima",
        location: "Dzüdza Hydro-Notch",
        status: "exceeding",
        strain_microstrain: 620,
        slope_strain: "620 µε (Hydrostatic Surge)",
        strain_threshold: 250,
        status_label: "Exceeding Threshold",
        depth: "26m Subsurface Aquifer",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0272, 25.7145],
      },
    },
    {
      type: "Feature",
      id: "sensor-das-08",
      properties: {
        id: "DAS-NODE-08",
        sensor_id: "DAS-NODE-08",
        name: "DAS Fiber Interferometer 08",
        type: "DAS Fiber Interferometer",
        corridor: "NH-29 Pherima",
        location: "East Flank Tension Crack",
        status: "normal",
        strain_microstrain: 110,
        slope_strain: "110 µε",
        strain_threshold: 250,
        status_label: "Normal",
        depth: "Distributed Optical Sensor Line",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0315, 25.7108],
      },
    },
    {
      type: "Feature",
      id: "sensor-tm-03",
      properties: {
        id: "TM-SLOPE-03",
        sensor_id: "TM-SLOPE-03",
        name: "In-Place Inclinometer 03",
        type: "In-Place Inclinometer / Tiltmeter",
        corridor: "NH-29 Pherima",
        location: "Peducha Junction Scarp",
        status: "normal",
        strain_microstrain: 85,
        slope_strain: "85 µε",
        strain_threshold: 250,
        status_label: "Normal",
        depth: "14m Vertical Casing",
      },
      geometry: {
        type: "Point",
        coordinates: [94.0368, 25.7062],
      },
    },
  ],
};

/**
 * Computes simulated field sensor telemetry across NH-29 Pherima Slope for hour 00:00 to 24:00.
 * Dynamic strain values peak at hour 14:00, exceeding 250 µε threshold (Red = Exceeding Threshold).
 */
export function computeSimulatedSensors(hour = 14) {
  const peakHour = 14;
  const intensity = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(3.5, 2)));

  const updatedFeatures = nh29FieldSensors.features.map((feat) => {
    const origProps = feat.properties || {};
    const id = origProps.id || "";

    let baseStrain = 35;
    let peakStrainAdd = 60;
    const threshold = 250;

    if (id === "DAS-NODE-04") {
      baseStrain = 48;
      peakStrainAdd = 532; // Reaches 580 µε at peak
    } else if (id === "TM-SLOPE-02") {
      baseStrain = 40;
      peakStrainAdd = 390; // Reaches 430 µε at peak
    } else if (id === "BP-PHERIMA-02") {
      baseStrain = 55;
      peakStrainAdd = 565; // Reaches 620 µε at peak
    } else if (id === "DAS-NODE-08") {
      baseStrain = 30;
      peakStrainAdd = 140; // Reaches 170 µε at peak
    } else if (id === "BP-PHERIMA-01") {
      baseStrain = 25;
      peakStrainAdd = 95; // Reaches 120 µε at peak
    } else if (id === "TM-SLOPE-03") {
      baseStrain = 28;
      peakStrainAdd = 82; // Reaches 110 µε at peak
    }

    const currentStrain = Math.round(baseStrain + peakStrainAdd * intensity);
    const isExceeding = currentStrain >= threshold;
    const status = isExceeding ? "exceeding" : "normal";
    const status_label = isExceeding ? "Exceeding Threshold" : "Normal";
    const strainNote = isExceeding ? " (Movement Detected)" : "";

    return {
      ...feat,
      properties: {
        ...origProps,
        strain_microstrain: currentStrain,
        slope_strain: `${currentStrain} µε${strainNote}`,
        status,
        status_label,
      },
    };
  });

  return {
    ...nh29FieldSensors,
    features: updatedFeatures,
  };
}
