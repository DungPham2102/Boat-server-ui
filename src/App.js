import React, { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "./components/Navbar";
import TelemetryPanel from "./components/TelemetryPanel";
import ControlPanel from "./components/ControlPanel";
import MapComponent from "./components/MapComponent";
import Console from "./components/Console";
import BoatManager from "./components/BoatManager";
import "./styles.css";

function App() {
  // State to hold all boats' telemetry data, keyed by boatId
  const [boatsData, setBoatsData] = useState({});
  const [selectedBoatId, setSelectedBoatId] = useState(null);

  const [logs, setLogs] = useState([]);
  const [boats, setBoats] = useState([]); // List of boats from DB
  const websocketRef = useRef(null);
  const [serverIp, setServerIp] = useState("localhost");
  const [ipInput, setIpInput] = useState("localhost");
  const [recenter, setRecenter] = useState(0);

  const handleConnect = () => {
    setServerIp(ipInput);
  };

  // Fetch boat metadata from the API
  useEffect(() => {
    if (!serverIp) return;
    fetch(`http://${serverIp}:3001/api/boats`)
      .then((res) => res.json())
      .then(setBoats)
      .catch((err) => {
        console.error("Error fetching boats:", err);
        setBoats([]);
      });
  }, [serverIp]);

  const appendLog = useCallback((msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // Setup WebSocket to listen for ALL boats
  useEffect(() => {
    if (!serverIp) return;

    try {
      // Connect to the '/all' endpoint to receive data from all boats
      const ws = new WebSocket(`ws://${serverIp}:8000/all`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection opened for ALL boats.");
        appendLog("WebSocket connection established for ALL boats!");
      };

      ws.onmessage = (event) => {
        const data = event.data.split(",");
        // Data format: BOAT_ID,lat,lon,current_head,target_head,left_speed,right_speed,pid
        if (data.length < 8) return;

        const boatId = data[0];

        // Update the state for the specific boat
        setBoatsData((prev) => ({
          ...prev,
          [boatId]: {
            lat: parseFloat(data[1]) || 0,
            lon: parseFloat(data[2]) || 0,
            head: parseFloat(data[3]) || 0,
            targetHead: parseFloat(data[4]) || 0,
            leftSpeed: parseInt(data[5]) || 1500,
            rightSpeed: parseInt(data[6]) || 1500,
            pid: parseFloat(data[7]) || 0,
          },
        }));

        // If no boat is selected yet, select the first one that sends data
        setSelectedBoatId(currentId => currentId || boatId);
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

      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      };
    } catch (error) {
      console.error("WebSocket construction error:", error);
      appendLog("Invalid Server IP format.");
    }
  }, [appendLog, serverIp]);

  const sendDataToWebSocket = useCallback(
    (dataToSend) => {
      if (!selectedBoatId) {
        appendLog("Cannot send data: No boat selected.");
        console.error("Cannot send data: No boat selected.");
        return;
      }
      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        // Prepend the selected boat's ID to the message
        const dataString = `${selectedBoatId},${dataToSend.mode},${dataToSend.speed},${dataToSend.targetLat},${dataToSend.targetLon},${dataToSend.kp},${dataToSend.ki},${dataToSend.kd}`;
        websocketRef.current.send(dataString);
        appendLog(`Data sent to ${selectedBoatId}: ${dataString}`);
      } else {
        appendLog("Cannot send data: WebSocket not connected.");
        console.error("WebSocket not connected.");
      }
    },
    [appendLog, selectedBoatId]
  );

  // Data for the currently selected boat, or empty object if none
  const selectedBoatData = boatsData[selectedBoatId] || {
    lat: 21.03873701,
    lon: 105.78245842,
    head: 0,
    targetHead: 0,
    leftSpeed: 1500,
    rightSpeed: 1500,
    pid: 0,
  };

  const selectedBoat = boats.find((b) => b.boatId === selectedBoatId);
  const selectedBoatDisplayName = selectedBoat
    ? `${selectedBoat.name} (${selectedBoat.boatId})`
    : selectedBoatId || "None";

  return (
    <div className="App">
      <Navbar />
      <div className="app-container">
        <div className="websocket-configurator">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label htmlFor="serverIpInput" style={{ marginRight: "5px", fontSize: "0.8em" }}>
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
            <button onClick={handleConnect} style={{ fontSize: "0.8em", padding: "5px 10px" }}>
              Connect
            </button>
            
            <label htmlFor="boatSelector" style={{ marginLeft: "20px", marginRight: "5px", fontSize: "0.8em" }}>
              Select Boat:
            </label>
            <select
              id="boatSelector"
              value={selectedBoatId || ""}
              onChange={(e) => setSelectedBoatId(e.target.value)}
              disabled={Object.keys(boatsData).length === 0}
              style={{
                padding: "5px",
                borderRadius: "3px",
                border: "1px solid #ced4da",
                fontSize: "0.8em",
              }}
            >
              <option value="" disabled>
                -- Select a boat --
              </option>
              {Object.keys(boatsData).map((boatId) => {
                const boat = boats.find((b) => b.boatId === boatId);
                const displayName = boat ? `${boat.name} (${boatId})` : boatId;
                return (
                  <option key={boatId} value={boatId}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <TelemetryPanel
          data={{
            "Selected Boat": selectedBoatDisplayName,
            Lat: selectedBoatData.lat,
            Lon: selectedBoatData.lon,
            "Current Head": selectedBoatData.head,
            "Target Head": selectedBoatData.targetHead,
            "Left Speed (pwm)": selectedBoatData.leftSpeed,
            "Right Speed (pwm)": selectedBoatData.rightSpeed,
            PID: selectedBoatData.pid,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <MapComponent
            boatsData={boatsData} // Pass all boats' data
            selectedBoatId={selectedBoatId}
            recenter={recenter}
            onBoatSelect={setSelectedBoatId} // Allow map to change selected boat
          />
          <button onClick={() => setRecenter(c => c + 1)} style={{ marginTop: '-2px', padding: '10px 20px' }}>
            Center on Selected Boat
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
          disabled={!selectedBoatId} // Disable panel if no boat is selected
        />
        <BoatManager boats={boats} setBoats={setBoats} serverIp={serverIp} />
      </div>
      <Console logs={logs} />
    </div>
  );
}

export default App;
