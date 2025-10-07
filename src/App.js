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

  const [logs, setLogs] = useState([]);
  const [boats, setBoats] = useState([]);
  const websocketRef = useRef(null);
  const [wsBoatId, setWsBoatId] = useState(""); // Default Boat ID
  const [serverIp, setServerIp] = useState("localhost"); // Default Server IP
  const [ipInput, setIpInput] = useState("localhost"); // IP input field
  const [recenter, setRecenter] = useState(0);

  const handleConnect = () => {
    setServerIp(ipInput);
  };

  useEffect(() => {
    if (!serverIp) return; // Do not fetch if no server IP is provided

    // Fetch boats from the database
    fetch(`http://${serverIp}:3001/api/boats`)
      .then((res) => res.json())
      .then((data) => {
        setBoats(data);
        if (data.length > 0) {
          setWsBoatId(data[0].boatId);
        }
      })
      .catch((err) => {
        console.error("Error fetching boats:", err);
        setBoats([]); // Clear boats on error
      });
  }, [serverIp]);

  const appendLog = useCallback((msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // Setup WebSocket
  useEffect(() => {
    if (!wsBoatId || !serverIp) return; // Do not connect if no boat or server IP is selected

    try {
      const ws = new WebSocket(`ws://${serverIp}:8000/${wsBoatId}`); // Use the Server IP and Boat ID in the URL
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket connection opened for boat ${wsBoatId}`);
        appendLog(`WebSocket connection established for boat ${wsBoatId}!`);
      };

      ws.onmessage = (event) => {
        console.log("Received message:", event.data);
        const data = event.data.split(",");

        // Data format: BOAT_ID,lat,lon,current_head,target_head,left_speed,right_speed
        if (data.length >= 7) {
          setTelemetry((prev) => ({
            ...prev,
            lat: parseFloat(data[1]) || prev.lat,
            lon: parseFloat(data[2]) || prev.lon,
            head: parseFloat(data[3]) || prev.head,
            targetHead: parseFloat(data[4]) || prev.targetHead,
            leftSpeed: parseInt(data[5]) || prev.leftSpeed,
            rightSpeed: parseInt(data[6]) || prev.rightSpeed,
            pid: parseFloat(data[7]) || prev.pid,
          }));
        }
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
    } catch (error) {
      console.error("WebSocket construction error:", error);
      appendLog("Invalid Server IP format.");
    }
  }, [appendLog, wsBoatId, serverIp]);

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <label
              htmlFor="serverIpInput"
              style={{ marginRight: "5px", fontSize: "0.8em" }}
            >
              Server IP:
            </label>
            <input
              id="serverIpInput"
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              style={{
                padding: "5px",
                borderRadius: "3px",
                border: "1px solid #ced4da",
                marginRight: "10px",
                fontSize: "0.8em",
              }}
            />
            <button
              onClick={handleConnect}
              style={{
                fontSize: "0.8em",
                padding: "5px 10px",
                marginRight: "10px",
              }}
            >
              Connect
            </button>
            <WebSocketConfigurator
              boats={boats}
              setWsBoatId={setWsBoatId}
              currentWsBoatId={wsBoatId}
            />
          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <MapComponent
            lat={telemetry.lat}
            lon={telemetry.lon}
            currentHead={telemetry.head}
            targetHead={telemetry.targetHead}
            recenter={recenter}
          />
          <button onClick={() => setRecenter(c => c + 1)} style={{ marginTop: '-2px', padding: '10px 20px' }}>
            Center on Boat
          </button>
        </div>
        <ControlPanel
          initialData={{
            mode: 0,
            speed: 1500,
            targetLat: 21.68942656,
            targetLon: 102.09262948,
            kp: 1.0,
            ki: 0.1,
            kd: 0.05,
          }}
          onSend={sendDataToWebSocket}
        />
        <BoatManager boats={boats} setBoats={setBoats} />
      </div>
      <Console logs={logs} />
    </div>
  );
}

export default App;
