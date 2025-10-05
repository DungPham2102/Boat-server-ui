import React, { useState, useEffect } from "react";

function WebSocketConfigurator({ boats, setWsBoatId, currentWsBoatId }) {
  const [selectedBoatId, setSelectedBoatId] = useState(currentWsBoatId);

  useEffect(() => {
    setSelectedBoatId(currentWsBoatId);
  }, [currentWsBoatId]);

  const handleSelectBoat = (event) => {
    const newBoatId = event.target.value;
    setSelectedBoatId(newBoatId);
    setWsBoatId(newBoatId);
    console.log(`Selected Boat ID: ${newBoatId}`); // Log the selected Boat ID
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
        htmlFor="boatIdSelect"
        style={{ marginRight: "5px", fontSize: "0.8em" }}
      >
        Select Boat:
      </label>
      <select
        id="boatIdSelect"
        value={selectedBoatId}
        onChange={handleSelectBoat}
        style={{
          padding: "5px",
          borderRadius: "3px",
          border: "1px solid #ced4da",
          marginRight: "5px",
          fontSize: "0.8em",
        }}
      >
        {boats.map((boat) => (
          <option key={boat.id} value={boat.boatId}>
            {boat.name} ({boat.boatId})
          </option>
        ))}
      </select>
    </div>
  );
}

export default WebSocketConfigurator;
