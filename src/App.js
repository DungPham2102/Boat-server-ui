import React, { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "./components/Navbar";
import TelemetryPanel from "./components/TelemetryPanel";
import ControlPanel from "./components/ControlPanel";
import MapComponent from "./components/MapComponent";
import Console from "./components/Console";
import WebSocketConfigurator from "./components/WebSocketConfigurator";
import BoatManager from "./components/BoatManager"; // Import the new component
import "./styles.css";

function App() {
  const [telemetry, setTelemetry] = useState({
    lat: 21.03873701,
    lon: 105.78245842,
    head: 10,
    targetHead: 90,
    leftSpeed: 1500,
    rightSpeed: 1500,
    pid: 0,
  });

  const [controls, setControls] = useState({
    mode: 0,
    speed: 1500,
    targetLat: 21.68942656,
    targetLon: 102.09262948,
    kp: 1.0,
    ki: 0.1,
    kd: 0.05,
  });

  const [logs, setLogs] = useState([]);
  const [boats, setBoats] = useState([]);
  const websocketRef = useRef(null);
  const [wsBoatId, setWsBoatId] = useState(""); // Default Boat ID

  useEffect(() => {
    fetch("http://localhost:3001/api/boats")
      .then((res) => res.json())
      .then((data) => {
        setBoats(data);
        if (data.length > 0) {
          setWsBoatId(data[0].boatId);
        }
      })
      .catch((err) => console.error("Error fetching boats:", err));
  }, []);

  const appendLog = useCallback((msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // Setup WebSocket
  useEffect(() => {
    if (!wsBoatId) return; // Do not connect if no boat is selected

    const ws = new WebSocket(`ws://localhost:8000/${wsBoatId}`); // Use the Boat ID in the URL
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connection opened for boat ${wsBoatId}`);
      appendLog(`WebSocket connection established for boat ${wsBoatId}!`);
    };

    ws.onmessage = (event) => {
      console.log("Received message:", event.data);
      const data = event.data.split(",");

      setTelemetry((prev) => ({
        ...prev, // Keep old values if new data is missing
        lat: parseFloat(data[0]) || prev.lat,
        lon: parseFloat(data[1]) || prev.lon,
        head: parseFloat(data[2]) || prev.head,
        targetHead: parseFloat(data[3]) || prev.targetHead,
        leftSpeed: parseInt(data[4]) || prev.leftSpeed,
        rightSpeed: parseInt(data[5]) || prev.rightSpeed,
        pid: parseFloat(data[6]) || prev.pid,
      }));
      appendLog(`Data received: ${event.data}`);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      appendLog("Connection closed!");
      websocketRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      appendLog("Error in connection!");
      websocketRef.current = null;
    };

    // Cleanup on component unmount
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [appendLog, wsBoatId]);

  const sendDataToWebSocket = useCallback(
    (dataToSend) => {
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        const dataString = `${dataToSend.mode},${dataToSend.speed},${dataToSend.targetLat},${dataToSend.targetLon},${dataToSend.kp},${dataToSend.ki},${dataToSend.kd}`;
        websocketRef.current.send(dataString);
        appendLog(`Data sent: ${dataString}`);
      } else {
        appendLog("Cannot send data: WebSocket not connected.");
        console.error("WebSocket not connected.");
      }
    },
    [appendLog]
  );

  return (
    // Main App Component
    <div className="App">
      <Navbar />
      <div className="app-container">
        <div className="websocket-configurator">
          <WebSocketConfigurator
            boats={boats}
            setWsBoatId={setWsBoatId}
            currentWsBoatId={wsBoatId}
          />
        </div>
        <TelemetryPanel
          data={{
            Lat: telemetry.lat,
            Lon: telemetry.lon,
            "Current Head": telemetry.head,
            "Target Head": telemetry.targetHead,
            "Left Speed (pwm)": telemetry.leftSpeed,
            "Right Speed (pwm)": telemetry.rightSpeed,
            PID: telemetry.pid,
          }}
        />
        <MapComponent
          lat={telemetry.lat}
          lon={ telemetry.lon}
          currentHead={telemetry.head}
          targetHead={telemetry.targetHead}
        />
        <ControlPanel initialData={controls} onSend={sendDataToWebSocket} />
        <BoatManager boats={boats} setBoats={setBoats} />
      </div>
      <Console logs={logs} />
    </div>
  );
}

export default App;
