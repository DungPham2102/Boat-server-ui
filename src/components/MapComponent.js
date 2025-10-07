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

const MapComponent = ({ lat, lon, currentHead, targetHead, recenter }) => {
  const mapRef = useRef(null);
  const boatMarkerRef = useRef(null);
  const circlesRef = useRef([]);
  const currentHeadingLineRef = useRef(null);
  const targetHeadingLineRef = useRef(null);
  const radarLinesRef = useRef(/** @type {L.Polyline[]} */ ([]));
  const animationFrameRef = useRef(null); // To control animation frame

  // Function to calculate a point given an angle and radius
  const rotateLine = useCallback((angle, centerCoord) => {
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
  }, []);

  // Initialize Map (runs only once)
  useEffect(() => {
    // @ts-ignore
    const map = L.map("map", {
      center: [lat, lon],
      zoom: 19,
      scrollWheelZoom: true,
      touchZoom: true,
      zoomControl: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 20,
    }).addTo(map);

    // @ts-ignore
    boatMarkerRef.current = L.marker([lat, lon]).addTo(map);

    // Draw initial circles
    const radii = [75, 50, 25];
    radii.forEach((radius) => {
      const circle = L.circle([lat, lon], {
        color: "rgb(131, 222, 70)",
        fillColor: "rgb(43, 75, 37)",
        fillOpacity: 0.4,
        radius: radius,
      }).addTo(map);
      // @ts-ignore
      circlesRef.current.push(circle);
    });

    // Draw initial heading lines
    const currentHeadingEnd = rotateLine(currentHead, [lat, lon]);
    // @ts-ignore
    currentHeadingLineRef.current = L.polyline([[lat, lon], currentHeadingEnd], {
      color: "yellow",
      weight: 3,
    }).addTo(map);

    const targetHeadingEnd = rotateLine(targetHead, [lat, lon]);
    // @ts-ignore
    targetHeadingLineRef.current = L.polyline([[lat, lon], targetHeadingEnd], {
      color: "red",
      weight: 3,
    }).addTo(map);

    // Radar animation setup
    let angle = 0;
    const updateRadarAnimation = () => {
      if (mapRef.current && boatMarkerRef.current) {
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

        angle = (angle + 1) % 360;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update Boat Position & Map View
  useEffect(() => {
    if (mapRef.current && boatMarkerRef.current) {
      const centerCoord = [lat, lon];
      // @ts-ignore
      boatMarkerRef.current.setLatLng(centerCoord);

      // Update circles
      // @ts-ignore
      circlesRef.current.forEach((circle) => {
        circle.setLatLng(centerCoord);
      });

      // Update heading lines
      const currentHeadingEnd = rotateLine(currentHead, centerCoord);
      // @ts-ignore
      currentHeadingLineRef.current.setLatLngs([centerCoord, currentHeadingEnd]);

      const targetHeadingEnd = rotateLine(targetHead, centerCoord);
      // @ts-ignore
      targetHeadingLineRef.current.setLatLngs([centerCoord, targetHeadingEnd]);
    }
  }, [lat, lon, currentHead, targetHead, rotateLine]);

  // Recenter map
  useEffect(() => {
    // This effect is intentionally only dependent on `recenter`.
    // It runs when the user clicks the "Center on Boat" button.
    // The `lat` and `lon` values are correctly captured from the render
    // triggered by the state change of `recenter`, so they are up-to-date.
    if (mapRef.current && recenter > 0) {
      mapRef.current.panTo([lat, lon]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter]);

  return <div id="map"></div>;
};

export default MapComponent;
