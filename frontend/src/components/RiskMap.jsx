"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  rescueRoute,
  getStatePreset,
  computeSimulatedCorridorRoutes,
  computeSimulatedSensors,
} from "../data/mockLandslideData.js";

// Read token securely from environment variable (Next.js or Vite)
const MAPBOX_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  (typeof import.meta !== "undefined" &&
  import.meta?.env?.VITE_MAPBOX_ACCESS_TOKEN
    ? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
    : "");

const hasValidToken = Boolean(
  MAPBOX_ACCESS_TOKEN &&
  MAPBOX_ACCESS_TOKEN.trim().length > 0 &&
  !MAPBOX_ACCESS_TOKEN.includes("your_mapbox_access_token")
);

/**
 * RiskMap — High-fidelity 3D Mapbox GL JS map for Terra360
 */
export default function RiskMap({
  variant = "full",
  center = [94.02, 25.72],
  zoom = 13.5,
  pitch = 60,
  bearing = -20,
  selectedState,
  showHud,
  showPlayback,
  showControls = true,
  onSelectCorridor,
  className = "",
  onMapLoaded,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const selectedStateRef = useRef(selectedState);

  // Camera navigation helper with smooth flyTo animation across Northeast states
  const navigateToState = React.useCallback(
    (stateName, duration = 2000) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const preset = getStatePreset(stateName || "All States");
      if (!preset) return;

      try {
        map.flyTo({
          center: preset.center,
          zoom: preset.zoom,
          pitch: preset.pitch ?? 60,
          bearing: preset.bearing ?? 0,
          essential: true,
          duration,
        });
      } catch (err) {
        console.warn("Map camera navigation error:", err);
      }
    },
    []
  );

  const effectiveShowHud =
    showHud !== undefined
      ? showHud
      : variant !== "mini" && variant !== "simple";

  // Layer visibility toggle states
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const [riskHeatmapEnabled, setRiskHeatmapEnabled] = useState(true);
  const [rescueRouteEnabled, setRescueRouteEnabled] = useState(true);
  const [fieldSensorsEnabled, setFieldSensorsEnabled] = useState(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  // Compute live simulated corridor routes GeoJSON filtered by selectedState
  const simulatedCorridorData = useMemo(() => {
    const base = computeSimulatedCorridorRoutes(14);
    const activeStateLower = (selectedState || "").trim().toLowerCase();
    const isStateFiltered = Boolean(
      activeStateLower &&
      activeStateLower !== "all states" &&
      activeStateLower !== "all" &&
      activeStateLower !== "default"
    );

    const filteredFeatures = base.features.filter((feat) => {
      if (!isStateFiltered) return true;
      const featState = String(feat.properties?.state || "").toLowerCase().trim();
      return (
        featState === activeStateLower ||
        activeStateLower.includes(featState) ||
        featState.includes(activeStateLower)
      );
    });

    return {
      ...base,
      features: filteredFeatures,
    };
  }, [selectedState]);

  // Compute live simulated field sensor telemetry along NH-29 Pherima slope
  const simulatedSensorsData = useMemo(() => {
    return computeSimulatedSensors(14);
  }, []);

  // Target segment (NH-29 Pherima Slide Cut) live telemetry values
  const targetSegment = simulatedCorridorData.features.find(
    (f) => f.properties?.id === "nh29-seg-3"
  );
  const targetProps = targetSegment?.properties || {
    status: "critical",
    soil_moisture_pct: 84,
    pore_water_pressure_kpa: 210,
    tilt_rate_mm_h: 0.28,
  };
  const isPorePressureCritical = (targetProps.pore_water_pressure_kpa || 0) >= 200;
  const rainfallIntensity = 84;

  // Resolve initial camera position based on selectedState preset or passed center/zoom props
  const statePreset = selectedState ? getStatePreset(selectedState) : null;
  const isDefaultNagalandCenter = center[0] === 94.02 && center[1] === 25.72;
  const initialCenter = (!isDefaultNagalandCenter || !statePreset) ? center : statePreset.center;
  const initialZoom = (!isDefaultNagalandCenter || !statePreset) ? zoom : statePreset.zoom;
  const initialPitch = statePreset?.pitch ?? pitch;
  const initialBearing = statePreset?.bearing ?? bearing;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!hasValidToken) {
      console.warn(
        "Mapbox Access Token is missing. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in Vercel environment variables to enable 3D terrain and interactive telemetry."
      );
      return;
    }

    // Securely set Mapbox access token
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Initialize Mapbox map instance
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
      antialias: true,
    });

    mapInstanceRef.current = map;
    if (typeof window !== "undefined") {
      window.__riskMap = map;
      window.__riskMapFlyToState = (stateName) => navigateToState(stateName);
    }

    // Add navigation controls (top-right)
    if (showControls) {
      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );
    }

    map.on("style.load", () => {
      // 1. Add 3D Mountain Terrain (mapbox-dem raster-dem with 1.5 exaggeration)
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
        });
      }

      if (terrainEnabled) {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      }

      // 2. Locate first symbol layer to preserve clean label visibility
      const layers = map.getStyle()?.layers;
      let labelLayerId;

      if (layers) {
        for (const layer of layers) {
          if (
            layer.type === "symbol" &&
            layer.layout &&
            "text-field" in layer.layout
          ) {
            labelLayerId = layer.id;
            break;
          }
        }
      }

      // 3. Add Terrain Hillshade Layer
      if (!map.getSource("mapbox-dem-hillshade")) {
        map.addSource("mapbox-dem-hillshade", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
        });
      }

      if (!map.getLayer("terrain-hillshade")) {
        map.addLayer(
          {
            id: "terrain-hillshade",
            type: "hillshade",
            source: "mapbox-dem-hillshade",
            layout: {
              visibility: terrainEnabled ? "visible" : "none",
            },
            paint: {
              "hillshade-exaggeration": 0.65,
              "hillshade-shadow-color": "#173D32",
              "hillshade-highlight-color": "#ffffff",
            },
          },
          labelLayerId
        );
      }

      // 4. Insert fill-extrusion 3D building layer beneath labels
      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#e8e5df",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.9,
            },
          },
          labelLayerId
        );
      }

      // 5. Directional lighting for soft lateral drop shadows
      map.setLight({
        anchor: "viewport",
        position: [1.5, 90, 45],
        intensity: 0.35,
      });

      // 6. Custom layer tints: water #98ddf2, greenways #d7ebd6
      if (map.getLayer("water")) {
        try {
          map.setPaintProperty("water", "fill-color", "#98ddf2");
        } catch {}
      }

      const greenwayLayerIds = [
        "landcover",
        "landuse",
        "national-park",
        "park",
        "greenway",
        "natural-point-label",
      ];
      greenwayLayerIds.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          try {
            map.setPaintProperty(layerId, "fill-color", "#d7ebd6");
          } catch {}
        }
      });

      // 7. Add corridorRoutes GeoJSON source
      if (!map.getSource("corridor-routes")) {
        map.addSource("corridor-routes", {
          type: "geojson",
          data: simulatedCorridorData,
        });
      }

      // 8. Hazard Risk Heatmap Glow Layer (underneath main corridor lines)
      if (!map.getLayer("hazard-risk-heatmap")) {
        map.addLayer(
          {
            id: "hazard-risk-heatmap",
            type: "line",
            source: "corridor-routes",
            layout: {
              visibility: riskHeatmapEnabled ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 18,
              "line-blur": 10,
              "line-opacity": 0.7,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "safe",
                "#00E676",
                "warning",
                "#FFA500",
                "critical",
                "#FF0000",
                "#FFA500",
              ],
            },
          },
          labelLayerId
        );
      }

      // 9. Main Corridor Line Layer (width 6px, status colored)
      if (!map.getLayer("corridor-layer")) {
        map.addLayer(
          {
            id: "corridor-layer",
            type: "line",
            source: "corridor-routes",
            layout: {
              visibility: riskHeatmapEnabled ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 6,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "safe",
                "#00E676",
                "warning",
                "#FFA500",
                "critical",
                "#FF0000",
                "#FFA500",
              ],
            },
          },
          labelLayerId
        );
      }

      if (!map.getLayer("corridor-lines")) {
        map.addLayer(
          {
            id: "corridor-lines",
            type: "line",
            source: "corridor-routes",
            layout: {
              visibility: riskHeatmapEnabled ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 6,
              "line-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "safe",
                "#00E676",
                "warning",
                "#FFA500",
                "critical",
                "#FF0000",
                "#FFA500",
              ],
            },
          },
          labelLayerId
        );
      }

      // 10. Add rescueRoute GeoJSON source & dashed electric blue line layer (#00B0FF, line-dasharray: [2, 2])
      if (!map.getSource("rescue-route")) {
        map.addSource("rescue-route", {
          type: "geojson",
          data: rescueRoute,
        });
      }

      if (!map.getLayer("rescue-route-lines")) {
        map.addLayer(
          {
            id: "rescue-route-lines",
            type: "line",
            source: "rescue-route",
            layout: {
              visibility: rescueRouteEnabled ? "visible" : "none",
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 4.5,
              "line-color": "#00B0FF",
              "line-dasharray": [2, 2],
            },
          },
          labelLayerId
        );
      }

      // 10b. Add Field Sensors GeoJSON point source & status-glowing circle layers along Pherima cut
      if (!map.getSource("field-sensors")) {
        map.addSource("field-sensors", {
          type: "geojson",
          data: simulatedSensorsData,
        });
      }

      // Outer status-colored aura glow layer (Green = Normal, Red = Exceeding Threshold)
      if (!map.getLayer("field-sensors-glow")) {
        map.addLayer(
          {
            id: "field-sensors-glow",
            type: "circle",
            source: "field-sensors",
            layout: {
              visibility: fieldSensorsEnabled ? "visible" : "none",
            },
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                8,
                13.5,
                12,
                16,
                17,
              ],
              "circle-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "exceeding",
                "#FF0000",
                "critical",
                "#FF0000",
                "#00E676",
              ],
              "circle-blur": 0.65,
              "circle-opacity": 0.85,
            },
          },
          labelLayerId
        );
      }

      // Inner crisp circular sensor node pin
      if (!map.getLayer("field-sensors-point")) {
        map.addLayer(
          {
            id: "field-sensors-point",
            type: "circle",
            source: "field-sensors",
            layout: {
              visibility: fieldSensorsEnabled ? "visible" : "none",
            },
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                4,
                13.5,
                6,
                16,
                8,
              ],
              "circle-color": [
                "match",
                ["downcase", ["to-string", ["get", "status"]]],
                "exceeding",
                "#FF0000",
                "critical",
                "#FF0000",
                "#00E676",
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-opacity": 1.0,
              "circle-opacity": 1.0,
            },
          },
          labelLayerId
        );
      }

      // 10c. Hover Mini-Tooltip for Field Sensor Nodes
      let sensorTooltipPopup = null;

      const handleSensorMouseEnter = (e) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features || !e.features[0]) return;

        const props = e.features[0].properties || {};
        const coordinates = e.features[0].geometry.coordinates.slice();
        const id = props.id || props.sensor_id || "DAS-NODE-04";
        const name = props.name || "Slope Field Sensor";
        const type = props.type || "DAS Fiber Interferometer";
        const location = props.location || "Pherima Slope Cut";
        const strain = props.slope_strain || `${props.strain_microstrain || 48} µε`;
        const status = String(props.status || "normal").toLowerCase();
        const isExceeding = status === "exceeding" || status === "critical";
        const statusLabel = isExceeding ? "Exceeding Threshold" : "Normal";
        const statusColor = isExceeding ? "#DC2626" : "#16A34A";
        const statusBg = isExceeding ? "#FEF2F2" : "#ECFDF5";
        const statusBorder = isExceeding ? "#FECACA" : "#A7F3D0";
        const depth = props.depth
          ? `<div style="color: #6B7280; font-size: 9.5px; margin-top: 2px;">📍 ${location} • ${props.depth}</div>`
          : "";

        const tooltipHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 7px 9px; min-width: 215px; color: #173D32;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
              <span style="font-weight: 800; font-size: 11.5px; letter-spacing: 0.03em; color: #111827; display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 9999px; background-color: ${statusColor}; box-shadow: 0 0 6px ${statusColor};"></span>
                ${id}
              </span>
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder};">
                ${statusLabel}
              </span>
            </div>
            <div style="font-size: 10.5px; color: #374151; font-weight: 700; margin-bottom: 2px;">
              ${type}
            </div>
            ${depth}
            <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; background-color: #F8FAFC; padding: 4px 8px; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 10.5px;">
              <span style="color: #4B5563; font-weight: 600;">Slope Strain:</span>
              <span style="font-weight: 800; color: ${statusColor};">${strain}</span>
            </div>
          </div>
        `;

        if (sensorTooltipPopup) {
          sensorTooltipPopup.remove();
        }

        sensorTooltipPopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "sensor-node-tooltip",
        })
          .setLngLat(coordinates)
          .setHTML(tooltipHTML)
          .addTo(map);
      };

      const handleSensorMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        if (sensorTooltipPopup) {
          sensorTooltipPopup.remove();
          sensorTooltipPopup = null;
        }
      };

      map.on("mouseenter", "field-sensors-point", handleSensorMouseEnter);
      map.on("mouseleave", "field-sensors-point", handleSensorMouseLeave);
      map.on("mouseenter", "field-sensors-glow", handleSensorMouseEnter);
      map.on("mouseleave", "field-sensors-glow", handleSensorMouseLeave);

      // 11. Telemetry Popups: Click listener on corridor segments
      const handleCorridorClick = (e) => {
        if (!e.features || !e.features[0]) return;
        const feature = e.features[0];
        const props = feature.properties || {};

        const segmentName = props.segment_name || props.name || "NH-29 Pherima Slide Cut";
        const status = props.status || props.riskStatus || "critical";
        const statusLower = String(status).toLowerCase();
        const isRedOrOrange =
          statusLower === "critical" ||
          statusLower === "warning" ||
          statusLower === "blocked" ||
          statusLower === "caution";

        const soilMoisture =
          props.soil_moisture_pct !== undefined
            ? `${props.soil_moisture_pct}%`
            : props.soilMoisture || "84%";
        const poreWaterPressure =
          props.pore_water_pressure_kpa !== undefined
            ? `${props.pore_water_pressure_kpa} kPa`
            : props.poreWaterPressure || "210 kPa";
        const tiltRate =
          props.tilt_rate_mm_h !== undefined
            ? `${props.tilt_rate_mm_h} mm/h`
            : props.tiltRate || "0.28 mm/h";

        const badgeBg =
          statusLower === "critical"
            ? "#FF0000"
            : statusLower === "warning"
            ? "#FFA500"
            : "#00E676";

        const popupHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 250px; color: #173D32;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid rgba(23,61,50,0.15); padding-bottom: 6px;">
              <div style="font-weight: 800; font-size: 13px; line-height: 1.3;">
                ${segmentName}
              </div>
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 9999px; background-color: ${badgeBg}; color: #ffffff; white-space: nowrap;">
                ${status}
              </span>
            </div>

            <div style="font-size: 11.5px; line-height: 1.6; background-color: #F6F4EC; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(23,61,50,0.1); margin-bottom: 8px;">
              <div><strong style="color: #173D32;">Segment Name:</strong> ${segmentName}</div>
              <div><strong style="color: #173D32;">Status:</strong> ${status}</div>
              <div><strong style="color: #173D32;">Soil Moisture:</strong> ${soilMoisture}</div>
              <div><strong style="color: #173D32;">Pore-Water Pressure:</strong> ${poreWaterPressure}</div>
              <div><strong style="color: #173D32;">Tilt Rate:</strong> ${tiltRate}</div>
            </div>

            ${
              isRedOrOrange
                ? `
              <button
                id="dispatch-rescue-btn"
                type="button"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  width: 100%;
                  padding: 8px 12px;
                  background-color: #DC2626;
                  color: #FFFFFF;
                  font-size: 11.5px;
                  font-weight: 800;
                  border-radius: 8px;
                  border: none;
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(220,38,38,0.25);
                  transition: all 0.2s ease-in-out;
                "
                onmouseover="this.style.backgroundColor='#B91C1C'; this.style.transform='translateY(-1px)';"
                onmouseout="this.style.backgroundColor='#DC2626'; this.style.transform='translateY(0)';"
              >
                <span>🚑</span> Dispatch Rescue Unit to Detour
              </button>
            `
                : ""
            }
          </div>
        `;

        if (onSelectCorridor) {
          onSelectCorridor(props.id || "nh29", props);
        }

        new mapboxgl.Popup({ offset: 12, closeButton: true, maxWidth: "320px" })
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
          .addTo(map);

        // Interactive dispatch action handler
        if (isRedOrOrange) {
          setTimeout(() => {
            const btn = document.getElementById("dispatch-rescue-btn");
            if (btn) {
              btn.onclick = () => {
                btn.innerHTML = "<span>✅</span> Rescue Unit Dispatched to Detour";
                btn.style.backgroundColor = "#16A34A";
                btn.style.boxShadow = "0 2px 4px rgba(22,163,74,0.25)";

                if (map.getLayer("rescue-route-lines")) {
                  map.setLayoutProperty("rescue-route-lines", "visibility", "visible");
                  map.setPaintProperty("rescue-route-lines", "line-width", 6.5);
                }
              };
            }
          }, 60);
        }
      };

      map.on("click", "corridor-layer", handleCorridorClick);
      map.on("click", "corridor-lines", handleCorridorClick);

      // Cursor styling on hover over corridor lines
      map.on("mouseenter", "corridor-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "corridor-layer", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "corridor-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "corridor-lines", () => {
        map.getCanvas().style.cursor = "";
      });

      // Click listener on rescueRoute detour line
      map.on("click", "rescue-route-lines", (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties || {};
        const name = props.name || "Emergency Relief Corridor";
        const note =
          props.detourNote ||
          "Designated alternate path for NDRF rescue convoys and emergency transit.";

        const detourHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 220px; color: #173D32;">
            <div style="font-weight: 800; font-size: 13px; color: #0077B6; margin-bottom: 4px;">
              🚑 ${name}
            </div>
            <div style="font-size: 11px; color: #374151; line-height: 1.45; background-color: #F0F9FF; padding: 6px 8px; border-radius: 6px; border: 1px solid #BAE6FD;">
              ${note}
            </div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 12, closeButton: true, maxWidth: "290px" })
          .setLngLat(e.lngLat)
          .setHTML(detourHTML)
          .addTo(map);
      });

      map.on("mouseenter", "rescue-route-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "rescue-route-lines", () => {
        map.getCanvas().style.cursor = "";
      });

      // 12. Custom Pulsing HTML Marker at [94.02, 25.72] (Break point / Slide collapse)
      const obstacleEl = document.createElement("div");
      obstacleEl.className = "obstacle-pulsing-marker";
      obstacleEl.style.display = "flex";
      obstacleEl.style.flexDirection = "column";
      obstacleEl.style.alignItems = "center";
      obstacleEl.style.cursor = "pointer";
      obstacleEl.style.pointerEvents = "auto";

      obstacleEl.innerHTML = `
        <style>
          @keyframes obstacle-beacon-ping {
            0% { transform: scale(0.9); opacity: 0.9; }
            70%, 100% { transform: scale(2.4); opacity: 0; }
          }
          @keyframes obstacle-beacon-pulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.35); opacity: 0.35; }
          }
        </style>
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <span style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background-color: rgba(220, 38, 38, 0.45); animation: obstacle-beacon-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.6); animation: obstacle-beacon-pulse 2s ease-in-out infinite;"></span>
          <div style="position: relative; width: 24px; height: 24px; border-radius: 9999px; background-color: #DC2626; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.7); display: flex; align-items: center; justify-content: center; font-size: 11px;">
            ⛔
          </div>
        </div>
        <div style="margin-top: 2px; background-color: #173D32; color: #FEE2E2; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border: 1.5px solid #EF4444; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: #EF4444; animation: obstacle-beacon-pulse 1s infinite;"></span>
          SLIDE COLLAPSE - NO PASSAGE
        </div>
      `;

      const obstaclePopup = new mapboxgl.Popup({
        offset: 16,
        closeButton: true,
        maxWidth: "290px",
      }).setHTML(`
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; color: #173D32;">
          <div style="display: flex; align-items: center; gap: 6px; color: #DC2626; font-weight: 800; font-size: 12px; margin-bottom: 4px;">
            <span>⛔</span> SLIDE COLLAPSE - NO PASSAGE
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #374151; background: #FEF2F2; padding: 6px 8px; border-radius: 6px; border: 1px solid #FECACA;">
            <strong>Exact Obstacle Location:</strong> [94.02, 25.72]<br/>
            <strong>Highway:</strong> NH-29 Pherima / Dzüdza Gorge<br/>
            <strong>Severity:</strong> Road Severed (60m Collapse)<br/>
            <strong>Action:</strong> Divert via Peducha Alternate Bypass
          </div>
        </div>
      `);

      new mapboxgl.Marker({ element: obstacleEl, anchor: "center" })
        .setLngLat([94.02, 25.72])
        .setPopup(obstaclePopup)
        .addTo(map);

      if (selectedStateRef.current || selectedState) {
        navigateToState(selectedStateRef.current || selectedState, 1500);
      }

      if (onMapLoaded) {
        onMapLoaded(map);
      }
    });

    // Cleanup map instance on unmount
    return () => {
      if (typeof window !== "undefined" && window.__riskMap === map) {
        delete window.__riskMap;
        delete window.__riskMapFlyToState;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [initialCenter, initialZoom, initialPitch, initialBearing, onMapLoaded, navigateToState, selectedState]);

  // Direct HUD Layer Toggle Handlers
  const handleToggleTerrain = (active) => {
    setTerrainEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        map.setTerrain(active ? { source: "mapbox-dem", exaggeration: 1.5 } : null);
        if (map.getLayer("terrain-hillshade")) {
          map.setLayoutProperty(
            "terrain-hillshade",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Terrain toggle warning:", err);
      }
    }
  };

  const handleToggleRiskHeatmap = (active) => {
    setRiskHeatmapEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        if (map.getLayer("corridor-layer")) {
          map.setLayoutProperty(
            "corridor-layer",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("corridor-lines")) {
          map.setLayoutProperty(
            "corridor-lines",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setLayoutProperty(
            "hazard-risk-heatmap",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Heatmap toggle warning:", err);
      }
    }
  };

  const handleToggleRescueRoute = (active) => {
    setRescueRouteEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        if (map.getLayer("rescue-route-lines")) {
          map.setLayoutProperty(
            "rescue-route-lines",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Rescue route toggle warning:", err);
      }
    }
  };

  const handleToggleSensors = (active) => {
    setFieldSensorsEnabled(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      try {
        if (map.getLayer("field-sensors-glow")) {
          map.setLayoutProperty(
            "field-sensors-glow",
            "visibility",
            active ? "visible" : "none"
          );
        }
        if (map.getLayer("field-sensors-point")) {
          map.setLayoutProperty(
            "field-sensors-point",
            "visibility",
            active ? "visible" : "none"
          );
        }
      } catch (err) {
        console.warn("Sensors toggle warning:", err);
      }
    }
  };

  // React to 3D Terrain Hillshade toggle switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getSource("mapbox-dem")) {
      map.setTerrain(
        terrainEnabled ? { source: "mapbox-dem", exaggeration: 1.5 } : null
      );
    }
    if (map.getLayer("terrain-hillshade")) {
      map.setLayoutProperty(
        "terrain-hillshade",
        "visibility",
        terrainEnabled ? "visible" : "none"
      );
    }
  }, [terrainEnabled]);

  // React to Hazard Risk Heatmap toggle switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("corridor-layer")) {
      map.setLayoutProperty(
        "corridor-layer",
        "visibility",
        riskHeatmapEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("corridor-lines")) {
      map.setLayoutProperty(
        "corridor-lines",
        "visibility",
        riskHeatmapEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("hazard-risk-heatmap")) {
      map.setLayoutProperty(
        "hazard-risk-heatmap",
        "visibility",
        riskHeatmapEnabled ? "visible" : "none"
      );
    }
  }, [riskHeatmapEnabled]);

  // React to Emergency Rescue Reroute toggle switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("rescue-route-lines")) {
      map.setLayoutProperty(
        "rescue-route-lines",
        "visibility",
        rescueRouteEnabled ? "visible" : "none"
      );
    }
  }, [rescueRouteEnabled]);

  // React to Field Sensor Nodes toggle switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("field-sensors-glow")) {
      map.setLayoutProperty(
        "field-sensors-glow",
        "visibility",
        fieldSensorsEnabled ? "visible" : "none"
      );
    }
    if (map.getLayer("field-sensors-point")) {
      map.setLayoutProperty(
        "field-sensors-point",
        "visibility",
        fieldSensorsEnabled ? "visible" : "none"
      );
    }
  }, [fieldSensorsEnabled]);

  // React to selectedState fly-to triggers
  useEffect(() => {
    selectedStateRef.current = selectedState;
    const map = mapInstanceRef.current;
    if (!map) return;

    navigateToState(selectedState, 2000);
  }, [selectedState, navigateToState]);

  // Dynamically update Mapbox source & trigger visual alert transition
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      const source = map.getSource("corridor-routes");
      if (source && typeof source.setData === "function") {
        source.setData(simulatedCorridorData);
      }

      const sensorSource = map.getSource("field-sensors");
      if (sensorSource && typeof sensorSource.setData === "function") {
        sensorSource.setData(simulatedSensorsData);
      }

      // Visual alert transition: when pore-water pressure exceeds 200 kPa (hour 14:00),
      // dynamically set the road segment line to solid pulsing red (#FF0000) with expanded glow
      if (isPorePressureCritical) {
        if (map.getLayer("corridor-layer")) {
          map.setPaintProperty("corridor-layer", "line-width", 7.5);
        }
        if (map.getLayer("corridor-lines")) {
          map.setPaintProperty("corridor-lines", "line-width", 7.5);
        }
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setPaintProperty("hazard-risk-heatmap", "line-width", 22);
          map.setPaintProperty("hazard-risk-heatmap", "line-blur", 14);
          map.setPaintProperty("hazard-risk-heatmap", "line-opacity", 0.9);
        }
      } else {
        if (map.getLayer("corridor-layer")) {
          map.setPaintProperty("corridor-layer", "line-width", 6);
        }
        if (map.getLayer("corridor-lines")) {
          map.setPaintProperty("corridor-lines", "line-width", 6);
        }
        if (map.getLayer("hazard-risk-heatmap")) {
          map.setPaintProperty("hazard-risk-heatmap", "line-width", 18);
          map.setPaintProperty("hazard-risk-heatmap", "line-blur", 10);
          map.setPaintProperty("hazard-risk-heatmap", "line-opacity", 0.7);
        }
      }
    } catch (err) {
      console.warn("Simulation data update error:", err);
    }
  }, [simulatedCorridorData, simulatedSensorsData, isPorePressureCritical]);

  return (
    <div
      className={`relative w-full h-full min-h-[400px] overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Dedicated clean container for Mapbox GL canvas */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
      />

      {!hasValidToken && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#173D32]/85 backdrop-blur-xs p-6 text-center select-none">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#FAF8F2]/95 border border-[#173D32]/15 shadow-2xl flex flex-col items-center text-[#173D32]">
            <div className="w-14 h-14 rounded-2xl bg-[#D6A65D]/20 border border-[#D6A65D]/40 flex items-center justify-center text-2xl mb-4 shadow-xs">
              🗺️
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#173D32] mb-2">
              Mapbox Access Token Required
            </h3>
            <p className="text-xs sm:text-sm text-[#173D32]/80 mb-4 leading-relaxed font-normal">
              Interactive 3D mountain terrain, slope telemetry, and corridor risk heatmaps require an active Mapbox access token.
            </p>
            <div className="w-full text-[11px] sm:text-xs font-mono font-semibold bg-[#173D32]/10 border border-[#173D32]/20 rounded-xl p-2.5 text-[#173D32] break-all select-all mb-4 text-center">
              NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
            </div>
            <p className="text-[11px] text-[#173D32]/60">
              Add this key in your Vercel Project Environment Variables and redeploy.
            </p>
          </div>
        </div>
      )}

      {/* Floating Top-Left Dashboard Overlay Card */}
      {effectiveShowHud && (
        <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20 max-w-[315px] sm:max-w-[340px] w-full bg-[#FAF8F2]/95 backdrop-blur-md rounded-2xl border border-[#173D32]/15 shadow-[0_12px_32px_rgba(23,61,50,0.14)] p-3.5 sm:p-4 text-[#173D32] select-none transition-all">
        {/* Card Header with Status Beacon & Collapse Toggle */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#173D32]/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#173D32]">
              Live Corridor HUD
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#173D32]/10 text-[#173D32]">
              NH-29
            </span>
            <button
              type="button"
              onClick={() => setIsHudCollapsed(!isHudCollapsed)}
              className="text-xs text-[#173D32]/60 hover:text-[#173D32] p-0.5 cursor-pointer font-bold"
              aria-label={isHudCollapsed ? "Expand HUD" : "Collapse HUD"}
            >
              {isHudCollapsed ? "＋" : "－"}
            </button>
          </div>
        </div>

        {!isHudCollapsed && (
          <>
            {/* Dynamic Status Badges */}
            <div className="space-y-2 mt-3 mb-3.5">
              {/* 1. Active Corridor Alert Badge */}
              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2 shadow-2xs transition-colors ${
                  isPorePressureCritical
                    ? "bg-red-50/95 border-red-300"
                    : targetProps.status === "warning"
                    ? "bg-amber-50/95 border-amber-200"
                    : "bg-emerald-50/95 border-emerald-200"
                }`}
              >
                <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
                  {isPorePressureCritical ? "⛔" : targetProps.status === "warning" ? "⚠️" : "✅"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isPorePressureCritical
                          ? "text-red-800"
                          : targetProps.status === "warning"
                          ? "text-amber-800"
                          : "text-emerald-800"
                      }`}
                    >
                      Active Corridor Alert
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded text-white ${
                        isPorePressureCritical
                          ? "bg-red-600 animate-pulse"
                          : targetProps.status === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                    >
                      {isPorePressureCritical
                        ? "BLOCKED"
                        : targetProps.status === "warning"
                        ? "WARNING"
                        : "PASSABLE"}
                    </span>
                  </div>
                  <p
                    className={`text-xs font-bold mt-0.5 leading-snug ${
                      isPorePressureCritical
                        ? "text-red-950"
                        : targetProps.status === "warning"
                        ? "text-amber-950"
                        : "text-emerald-950"
                    }`}
                  >
                    NH-29 Pherima Segment - {isPorePressureCritical ? "BLOCKED" : targetProps.status === "warning" ? "CAUTION" : "NORMAL TRANSIT"}
                  </p>
                </div>
              </div>

              {/* 2. Rainfall Intensity Badge */}
              <div className="p-2.5 rounded-xl bg-cyan-50/95 border border-cyan-200/90 flex items-start gap-2 shadow-2xs">
                <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
                  🌧️
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-cyan-800 tracking-wider">
                      Rainfall Intensity
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-700 text-white">
                      {rainfallIntensity} mm/h
                    </span>
                  </div>
                  <p className="text-xs font-bold text-cyan-950 mt-0.5 leading-snug">
                    {isPorePressureCritical
                      ? "Extreme Saturation (Doppler Peak)"
                      : rainfallIntensity >= 45
                      ? "Heavy Monsoon Downpour"
                      : "Light Baseline Drizzle"}
                  </p>
                </div>
              </div>

              {/* 3. Alternate Rescue Route Status Badge */}
              <div className="p-2.5 rounded-xl bg-blue-50/95 border border-blue-200/90 flex items-start gap-2 shadow-2xs">
                <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
                  🚑
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                      Alternate Rescue Route
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-950 mt-0.5 leading-snug">
                    Peducha Bypass Open for Convoys
                  </p>
                </div>
              </div>
            </div>

            {/* Layer Visibility Toggle Switches */}
            <div className="pt-2.5 border-t border-[#173D32]/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D32]/70 block mb-2">
                Layer Visibility Controls
              </span>

              <div className="space-y-1.5 text-xs font-semibold text-[#173D32]">
                {/* 3D Terrain Hillshade Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>🏔️</span> 3D Terrain Hillshade
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="terrain-toggle"
                      aria-label="Toggle 3D Terrain Hillshade"
                      checked={terrainEnabled}
                      onChange={(e) => handleToggleTerrain(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={terrainEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        terrainEnabled ? "bg-[#173D32]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          terrainEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Hazard Risk Heatmap Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>🔥</span> Hazard Risk Heatmap
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="heatmap-toggle"
                      aria-label="Toggle Hazard Risk Heatmap"
                      checked={riskHeatmapEnabled}
                      onChange={(e) => handleToggleRiskHeatmap(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={riskHeatmapEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        riskHeatmapEnabled ? "bg-[#173D32]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          riskHeatmapEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Emergency Rescue Reroute Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span> Emergency Rescue Reroute
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="rescue-route-toggle"
                      aria-label="Toggle Emergency Rescue Reroute"
                      checked={rescueRouteEnabled}
                      onChange={(e) => handleToggleRescueRoute(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={rescueRouteEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rescueRouteEnabled ? "bg-[#00B0FF]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          rescueRouteEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Field Sensor Nodes Toggle */}
                <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-[#173D32]/5 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>📡</span> Field Sensor Nodes
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="sensors-toggle"
                      aria-label="Toggle Field Sensor Nodes"
                      checked={fieldSensorsEnabled}
                      onChange={(e) => handleToggleSensors(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="switch"
                      aria-checked={fieldSensorsEnabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        fieldSensorsEnabled ? "bg-[#173D32]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          fieldSensorsEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Mini variant badge if HUD is hidden */}
      {!effectiveShowHud && variant === "mini" && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF8F2]/90 backdrop-blur-xs border border-[#173D32]/20 shadow-xs text-[#173D32] text-[11px] font-black uppercase tracking-wider select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
          </span>
          <span>3D GIS · NH-29</span>
        </div>
      )}

    </div>
  );
}
