// @ts-ignore
import React, { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon issue with Webpack/React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const MapComponent = ({ lat, lon, currentHead, targetHead }) => {
  const mapRef = useRef(null);
  const boatMarkerRef = useRef(null);
  const circlesRef = useRef([]);
  const currentHeadingLineRef = useRef(null);
  const targetHeadingLineRef = useRef(null);
  const radarLinesRef = useRef(/** @type {L.Polyline[]} */ ([]));
  const animationFrameRef = useRef(null); // To control animation frame

  const center = [lat, lon];

  // Function to calculate a point given an angle and radius
  const rotateLine = (angle, centerCoord) => {
    const radius = 75 / 111000;

    // centerCoord là một mảng [lat, lon]
    const currentLat = centerCoord[0];
    const currentLon = centerCoord[1];

    // Chuyển đổi góc từ độ sang radian cho Math.cos và Math.sin
    const angleRad = angle * (Math.PI / 180);

    // Tính toán newLat và newLon
    // Công thức này ngầm định coi 0 độ là hướng Bắc và tăng dần theo chiều kim đồng hồ
    // newLat phụ thuộc vào cos(angleRad) để dịch chuyển theo chiều Bắc/Nam
    // newLon phụ thuộc vào sin(angleRad) để dịch chuyển theo chiều Đông/Tây
    const newLat = currentLat + radius * Math.cos(angleRad);
    const newLon = currentLon + radius * Math.sin(angleRad);

    return [newLat, newLon];
  };

  // Function to draw radar circles
  const drawCircles = useCallback((map, centerCoord) => {
    circlesRef.current.forEach((layer) => map.removeLayer(layer));
    circlesRef.current = [];
    const radii = [75, 50, 25];
    radii.forEach((radius) => {
      const circle = L.circle(centerCoord, {
        color: "rgb(131, 222, 70)",
        fillColor: "rgb(43, 75, 37)",
        fillOpacity: 0.4,
        radius: radius,
      }).addTo(map);
      // @ts-ignore
      circlesRef.current.push(circle);
    });
  }, []);

  // Function to update heading lines
  const updateHeadingLines = useCallback(
    (map, centerCoord) => {
      const currentHeadingEnd = rotateLine(currentHead, centerCoord);
      const targetHeadingEnd = rotateLine(targetHead, centerCoord);

      if (currentHeadingLineRef.current)
        map.removeLayer(currentHeadingLineRef.current);
      if (targetHeadingLineRef.current)
        map.removeLayer(targetHeadingLineRef.current);

      // @ts-ignore
      currentHeadingLineRef.current = L.polyline(
        [centerCoord, currentHeadingEnd],
        {
          color: "yellow",
          weight: 3,
        }
      ).addTo(map);

      // @ts-ignore
      targetHeadingLineRef.current = L.polyline(
        [centerCoord, targetHeadingEnd],
        {
          color: "red",
          weight: 3,
        }
      ).addTo(map);
    },
    [currentHead, targetHead, rotateLine]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) {
      // @ts-ignore
      mapRef.current = L.map("map", {
        // @ts-ignore
        center: center,
        zoom: 19, // Adjusted zoom
        scrollWheelZoom: false,
        touchZoom: false,
        zoomControl: false,
        dragging: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 20, // Increased max zoom
        // @ts-ignore
      }).addTo(mapRef.current);

      // @ts-ignore
      boatMarkerRef.current = L.marker(center).addTo(mapRef.current);
      drawCircles(mapRef.current, center);
      updateHeadingLines(mapRef.current, center);
    }

    // Radar animation setup
    let angle = 0;
    const updateRadarAnimation = () => {
      if (mapRef.current) {
        // @ts-ignore
        const latLng = boatMarkerRef.current.getLatLng();
        const currentCenter = [latLng.lat, latLng.lng];
        const newPosition = rotateLine(angle, currentCenter);

        const radarLine = L.polyline([currentCenter, newPosition], {
          color: "rgb(136, 244, 60)",
          weight: 1,
          opacity: 1.0,
        }).addTo(mapRef.current);
        radarLinesRef.current.push(radarLine);

        // Update fading
        radarLinesRef.current = radarLinesRef.current.filter((line) => {
          // @ts-ignore
          const currentOpacity = line.options.opacity - 0.05;
          if (currentOpacity <= 0) {
            // @ts-ignore
            mapRef.current.removeLayer(line);
            return false;
          } else {
            line.setStyle({ opacity: currentOpacity });
            return true;
          }
        });

        angle = (angle + 1) % 360; // Increase speed slightly
      }
      // @ts-ignore
      animationFrameRef.current = requestAnimationFrame(updateRadarAnimation);
    };

    // @ts-ignore
    animationFrameRef.current = requestAnimationFrame(updateRadarAnimation);

    // Cleanup function
    return () => {
      // @ts-ignore
      cancelAnimationFrame(animationFrameRef.current);
      if (mapRef.current) {
        // @ts-ignore
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Update Boat Position & Map View
  useEffect(() => {
    const center = [lat, lon];
    if (mapRef.current && boatMarkerRef.current) {
      // @ts-ignore
      boatMarkerRef.current.setLatLng(center);
      // @ts-ignore
      mapRef.current.panTo(center);
      drawCircles(mapRef.current, center);
      updateHeadingLines(mapRef.current, center);
    }
  }, [lat, lon, currentHead, targetHead]);

  return <div id="map"></div>;
};

export default MapComponent;
