import React, { useState, useEffect } from "react";

function WebSocketConfigurator({ boats, setWsIp, currentWsIp }) {
  const [selectedIp, setSelectedIp] = useState(currentWsIp);

  useEffect(() => {
    setSelectedIp(currentWsIp);
  }, [currentWsIp]);

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
        Select Boat:
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
        {boats.map((boat) => (
          <option key={boat.id} value={boat.ip}>
            {boat.name} ({boat.ip})
          </option>
        ))}
      </select>
    </div>
  );
}

export default WebSocketConfigurator;
