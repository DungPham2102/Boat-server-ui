import React, { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "./components/Navbar";
import TelemetryPanel from "./components/TelemetryPanel";
import ControlPanel from "./components/ControlPanel";
import MapComponent from "./components/MapComponent";
import Console from "./components/Console";
import BoatManager from "./components/BoatManager";
import GatewayManager from "./components/GatewayManager";
import Login from "./components/Login"; // Import the Login component
import "./styles.css";

function App() {
  const [token, setToken] = useState(null);

  // State to hold all boats' telemetry data, keyed by boatId
  const [boatsData, setBoatsData] = useState({});
  const [selectedBoatId, setSelectedBoatId] = useState(null);

  const [logs, setLogs] = useState([]);
  const [boats, setBoats] = useState([]); // List of boats from DB
  const [gateways, setGateways] = useState([]); // List of gateways from DB
  const websocketRef = useRef(null);
  const [serverIp, setServerIp] = useState(window.location.hostname);
  const [ipInput, setIpInput] = useState(window.location.hostname);
  const [recenter, setRecenter] = useState(0);
  const [clickedCoords, setClickedCoords] = useState(null);

  const handleMapClick = (coords) => {
    setClickedCoords(coords);
  };

  // Check for a token in localStorage on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem("accessToken", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setToken(null);
    // Also clear other relevant state
    setBoatsData({});
    setBoats([]);
    setGateways([]); // Clear gateways on logout
    setSelectedBoatId(null);
  };

  const handleConnect = () => {
    setServerIp(ipInput);
  };

  const appendLog = useCallback((msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const fetchGateways = useCallback(() => {
    if (!serverIp || !token) return;

    fetch(`http://${serverIp}:3001/api/gateways`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        if (res.status === 401 || res.status === 403) {
          handleLogout();
        }
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch gateways");
      })
      .then(setGateways)
      .catch((err) => {
        console.error("Error fetching gateways:", err);
        appendLog(`Error fetching gateways: ${err.message}`);
        setGateways([]);
      });
  }, [serverIp, token, appendLog]);

  // Fetch boat metadata from the API
  useEffect(() => {
    if (!serverIp || !token) return; // Don't fetch if not logged in

    fetch(`http://${serverIp}:3001/api/boats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        // If token is invalid, log out
        if (res.status === 401 || res.status === 403) {
          handleLogout();
        }
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch boats");
      })
      .then(setBoats)
      .catch((err) => {
        if (err.message.includes("Token is not valid")) {
          appendLog("Session expired. Please log in again.");
        } else {
          console.error("Error fetching boats:", err);
          appendLog(`Error fetching boats: ${err.message}`);
        }
        setBoats([]);
      });
  }, [serverIp, token, appendLog]);

  // Fetch gateway metadata from the API
  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  // Setup WebSocket to listen for ALL boats
  useEffect(() => {
    if (!serverIp || !token) return; // Don't connect if not logged in

    try {
      // Connect to the '/all' endpoint, passing the token for authentication
      const ws = new WebSocket(`ws://${serverIp}:8000/all?token=${token}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection opened for ALL boats.");
        appendLog("WebSocket connection established for ALL boats!");
      };

      ws.onmessage = (event) => {
        appendLog(`Received data: ${event.data}`);
        try {
          const data = JSON.parse(event.data);
          const {
            boatId,
            lat,
            lon,
            head,
            targetHead,
            leftSpeed,
            rightSpeed,
            gateway_id,
          } = data;

          if (!boatId) {
            appendLog("Received data without boatId.");
            return;
          }

          // Update the state for the specific boat
          setBoatsData((prev) => ({
            ...prev,
            [boatId]: {
              lat: lat || 0,
              lon: lon || 0,
              head: head || 0,
              targetHead: targetHead || 0,
              leftSpeed: leftSpeed || 1500,
              rightSpeed: rightSpeed || 1500,
              gateway_id: gateway_id || null, // Save the gateway_id
            },
          }));

          // If no boat is selected yet, select the first one that sends data
          setSelectedBoatId((currentId) => currentId || boatId);
        } catch (error) {
          console.error("Failed to parse JSON:", error);
          appendLog("Received non-JSON message.");
        }
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
        if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
      };
    } catch (error) {
      console.error("WebSocket construction error:", error);
      appendLog("Invalid Server IP format.");
    }
  }, [appendLog, serverIp, token]);

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
        const payload = {
          boatId: selectedBoatId,
          ...dataToSend,
        };
        const dataString = JSON.stringify(payload);
        websocketRef.current.send(dataString);
        appendLog(`Data sent to ${selectedBoatId}: ${dataString}`);
      } else {
        appendLog("Cannot send data: WebSocket not connected.");
        console.error("WebSocket not connected.");
      }
    },
    [appendLog, selectedBoatId]
  );

  // If not logged in, show the Login component
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Data for the currently selected boat, or empty object if none
  const selectedBoatData = boatsData[selectedBoatId] || {
    lat: 21.03873701,
    lon: 105.78245842,
    head: 0,
    targetHead: 0,
    leftSpeed: 1500,
    rightSpeed: 1500,
  };

  const selectedBoat = boats.find((b) => b.boatId === selectedBoatId);
  const selectedBoatDisplayName = selectedBoat
    ? `${selectedBoat.name} (${selectedBoat.boatId})`
    : selectedBoatId || "None";

  return (
    <div className="App">
      <Navbar onLogout={handleLogout} />
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
              style={{ fontSize: "0.8em", padding: "5px 10px" }}
            >
              Connect
            </button>

            <label
              htmlFor="boatSelector"
              style={{
                marginLeft: "20px",
                marginRight: "5px",
                fontSize: "0.8em",
              }}
            >
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
            "Gateway ID": selectedBoatData.gateway_id || "N/A",
            Lat: selectedBoatData.lat,
            Lon: selectedBoatData.lon,
            "Current Head": selectedBoatData.head,
            "Target Head": selectedBoatData.targetHead,
            "Left Speed (pwm)": selectedBoatData.leftSpeed,
            "Right Speed (pwm)": selectedBoatData.rightSpeed,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <MapComponent
            boatsData={boatsData} // Pass all boats' data
            selectedBoatId={selectedBoatId}
            recenter={recenter}
            onBoatSelect={setSelectedBoatId} // Allow map to change selected boat
            onMapClick={handleMapClick}
            clickedCoords={clickedCoords}
          />
          <button
            onClick={() => setRecenter((c) => c + 1)}
            style={{ marginTop: "-2px", padding: "10px 20px" }}
          >
            Center on Selected Boat
          </button>
        </div>
        <ControlPanel
          initialData={{
            speed: 1500,
            targetLat: 21.68942656,
            targetLon: 102.09262948,
            kp: 1.0,
            ki: 0.1,
            kd: 0.05,
          }}
          onSend={sendDataToWebSocket}
          disabled={!selectedBoatId} // Disable panel if no boat is selected
          clickedCoords={clickedCoords}
        />
        <BoatManager
          boats={boats}
          setBoats={setBoats}
          serverIp={serverIp}
          token={token}
          gateways={gateways}
        />
        <GatewayManager
          serverIp={serverIp}
          token={token}
          gateways={gateways}
          setGateways={setGateways}
        />
      </div>
      <Console logs={logs} />
    </div>
  );
}

export default App;
