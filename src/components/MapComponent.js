// @ts-ignore
import React, { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Icon Setup ---
const boatIcon = L.icon({
  iconUrl: "/boat-icon.png", // Path to your icon in the public folder
  iconSize: [48, 48], // Adjust size as needed
  iconAnchor: [16, 16], // Adjust anchor to the center of the icon
});

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
const defaultIcon = L.icon({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Icon.Default.mergeOptions({ icon: defaultIcon });

const MapComponent = ({
  boatsData,
  selectedBoatId,
  recenter,
  onBoatSelect,
  onMapClick,
  clickedCoords,
}) => {
  const mapRef = useRef(null);
  const boatMarkersRef = useRef(new Map());
  const clickedLocationMarkerRef = useRef(null);

  // Refs for selected boat's visual effects
  const selectionCircleRef = useRef(null);
  const radarCirclesRef = useRef([]);
  const currentHeadingLineRef = useRef(null);
  const targetHeadingLineRef = useRef(null);
  const radarLinesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const radarAngleRef = useRef(0); // To persist angle between re-renders

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const rotateLine = useCallback((angle, centerCoord) => {
    const radius = 75 / 111000;
    const angleRad = angle * (Math.PI / 180);
    const newLat = centerCoord[0] + radius * Math.cos(angleRad);
    const newLon = centerCoord[1] + radius * Math.sin(angleRad);
    return [newLat, newLon];
  }, []);

  // --- Map Initialization (runs only once) ---
  useEffect(() => {
    const map = L.map("map", {
      center: [21.0387, 105.7824], // Initial center
      zoom: 19,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(map);

    map.on("click", (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng);
      }
    });

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // --- Update All Boat Markers ---
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentMarkerIds = Array.from(boatMarkersRef.current.keys());
    const incomingBoatIds = Object.keys(boatsData);

    incomingBoatIds.forEach((boatId) => {
      const boatData = boatsData[boatId];
      if (
        !boatData ||
        typeof boatData.lat !== "number" ||
        typeof boatData.lon !== "number"
      )
        return;

      const latLng = [boatData.lat, boatData.lon];
      const marker = boatMarkersRef.current.get(boatId);

      if (marker) {
        marker.setLatLng(latLng);
      } else {
        const newMarker = L.marker(latLng, { icon: boatIcon }).addTo(map);
        newMarker.on("click", () => onBoatSelect(boatId));
        boatMarkersRef.current.set(boatId, newMarker);
      }
    });

    const boatIdsToRemove = currentMarkerIds.filter(
      (id) => !incomingBoatIds.includes(id)
    );
    boatIdsToRemove.forEach((boatId) => {
      const markerToRemove = boatMarkersRef.current.get(boatId);
      if (markerToRemove) {
        map.removeLayer(markerToRemove);
        boatMarkersRef.current.delete(boatId);
      }
    });
  }, [boatsData, onBoatSelect]);

  // --- Update Selected Boat Visuals (Non-animated) ---
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const selectedData = boatsData[selectedBoatId];

    if (selectedData) {
      const { lat, lon, head, targetHead } = selectedData;
      const latLng = [lat, lon];

      // Update selection circle
      if (!selectionCircleRef.current) {
        selectionCircleRef.current = L.circle(latLng, {
          color: "#00f",
          fillColor: "#00f",
          fillOpacity: 0.2,
          radius: 20,
        }).addTo(map);
      } else {
        selectionCircleRef.current
          .setLatLng(latLng)
          .setStyle({ opacity: 1, fillOpacity: 0.2 });
      }

      // Update radar circles
      if (radarCirclesRef.current.length === 0) {
        [75, 50, 25].forEach((radius) => {
          const circle = L.circle(latLng, {
            color: "rgb(131, 222, 70)",
            fillColor: "rgb(43, 75, 37)",
            fillOpacity: 0.4,
            radius,
          }).addTo(map);
          radarCirclesRef.current.push(circle);
        });
      } else {
        radarCirclesRef.current.forEach((c) => c.setLatLng(latLng));
      }

      // Update heading lines
      const currentHeadingEnd = rotateLine(head, latLng);
      if (!currentHeadingLineRef.current) {
        currentHeadingLineRef.current = L.polyline(
          [latLng, currentHeadingEnd],
          { color: "yellow", weight: 3 }
        ).addTo(map);
      } else {
        currentHeadingLineRef.current.setLatLngs([latLng, currentHeadingEnd]);
      }

      const targetHeadingEnd = rotateLine(targetHead, latLng);
      if (!targetHeadingLineRef.current) {
        targetHeadingLineRef.current = L.polyline([latLng, targetHeadingEnd], {
          color: "red",
          weight: 3,
        }).addTo(map);
      } else {
        targetHeadingLineRef.current.setLatLngs([latLng, targetHeadingEnd]);
      }
    } else {
      // No boat selected, so clean up static visuals
      if (selectionCircleRef.current) {
        selectionCircleRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
      }
      if (currentHeadingLineRef.current) {
        map.removeLayer(currentHeadingLineRef.current);
        currentHeadingLineRef.current = null;
      }
      if (targetHeadingLineRef.current) {
        map.removeLayer(targetHeadingLineRef.current);
        targetHeadingLineRef.current = null;
      }
      radarCirclesRef.current.forEach((c) => map.removeLayer(c));
      radarCirclesRef.current = [];
    }
  }, [selectedBoatId, boatsData, rotateLine]);

  // --- Radar Animation Effect ---
  useEffect(() => {
    if (!mapRef.current || !selectedBoatId) {
      return; // No animation if no boat is selected
    }
    const map = mapRef.current;

    const updateRadarAnimation = () => {
      const currentBoatMarker = boatMarkersRef.current.get(selectedBoatId);
      // Stop if boat is gone or map is removed
      if (!currentBoatMarker || !mapRef.current) {
        return;
      }

      const currentCenter = currentBoatMarker.getLatLng();
      const newPosition = rotateLine(radarAngleRef.current, [
        currentCenter.lat,
        currentCenter.lng,
      ]);
      const radarLine = L.polyline([currentCenter, newPosition], {
        color: "rgb(136, 244, 60)",
        weight: 1,
        opacity: 1.0,
      }).addTo(map);
      radarLinesRef.current.push(radarLine);

      // Fade out and remove old lines
      radarLinesRef.current = radarLinesRef.current.filter((line) => {
        const currentOpacity = line.options.opacity - 0.05;
        if (currentOpacity <= 0) {
          map.removeLayer(line);
          return false;
        }
        line.setStyle({ opacity: currentOpacity });
        return true;
      });

      radarAngleRef.current = (radarAngleRef.current + 1) % 360;
      animationFrameRef.current = requestAnimationFrame(updateRadarAnimation);
    };

    // Start the animation
    animationFrameRef.current = requestAnimationFrame(updateRadarAnimation);

    // Cleanup function for when the selected boat changes or component unmounts
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Clean up any remaining animation lines
      radarLinesRef.current.forEach((l) => map.removeLayer(l));
      radarLinesRef.current = [];
      radarAngleRef.current = 0; // Reset angle for the next selection
    };
  }, [selectedBoatId, rotateLine]); // Only re-run when the boat selection changes

  const boatsDataRef = useRef(boatsData);
  useEffect(() => {
    boatsDataRef.current = boatsData;
  }, [boatsData]);

  // --- Recenter Map Effect ---
  useEffect(() => {
    if (
      recenter > 0 &&
      mapRef.current &&
      selectedBoatId &&
      boatsDataRef.current[selectedBoatId]
    ) {
      const { lat, lon } = boatsDataRef.current[selectedBoatId];
      mapRef.current.panTo([lat, lon]);
    }
  }, [recenter, selectedBoatId]);

  // --- Update Clicked Location Marker ---
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (clickedLocationMarkerRef.current) {
      map.removeLayer(clickedLocationMarkerRef.current);
    }

    if (clickedCoords) {
      const newMarker = L.marker([clickedCoords.lat, clickedCoords.lng], {
        icon: defaultIcon,
      }).addTo(map);
      clickedLocationMarkerRef.current = newMarker;
    }
  }, [clickedCoords]);

  return <div id="map"></div>;
};

export default MapComponent;
