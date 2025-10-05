import React, { useState } from "react";
import ipList from "../ipList"; // Import the IP list

function WebSocketConfigurator({ setWsIp, currentWsIp }) {
  const [ipInput, setIpInput] = useState("");
  const [availableIps, setAvailableIps] = useState(ipList); // Use the imported IP list
  const [selectedIp, setSelectedIp] = useState(currentWsIp);

  const handleIpChange = (event) => {
    setIpInput(event.target.value);
  };

  const handleAddIp = () => {
    if (ipInput && !availableIps.includes(ipInput)) {
      setAvailableIps([...availableIps, ipInput]);
      setIpInput("");
    }
  };

  const handleSelectIp = (event) => {
    const newIp = event.target.value;
    setSelectedIp(newIp);
    setWsIp(newIp);
    console.log(`Selected IP: ${newIp}`); // Log the selected IP
  };

  return (
    <div
      className="websocket-configurator"
      style={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <label
        htmlFor="ipSelect"
        style={{ marginRight: "5px", fontSize: "0.8em" }}
      >
        Select IP:
      </label>
      <select
        id="ipSelect"
        value={selectedIp}
        onChange={handleSelectIp}
        style={{
          padding: "5px",
          borderRadius: "3px",
          border: "1px solid #ced4da",
          marginRight: "5px",
          fontSize: "0.8em",
        }}
      >
        {availableIps.map((ip) => (
          <option key={ip} value={ip}>
            {ip}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Add New IP"
        value={ipInput}
        onChange={handleIpChange}
        style={{
          padding: "5px",
          borderRadius: "3px",
          border: "1px solid #ced4da",
          marginRight: "5px",
          fontSize: "0.8em",
          width: "120px",
        }}
      />
      <button
        onClick={handleAddIp}
        style={{
          padding: "5px 8px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "3px",
          cursor: "pointer",
          fontSize: "0.8em",
        }}
      >
        Add IP
      </button>
    </div>
  );
}

export default WebSocketConfigurator;
