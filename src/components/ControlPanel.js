import React, { useState, useEffect } from "react";

const ControlPanel = ({ initialData, onSend, clickedCoords }) => {
  const [controls, setControls] = useState(initialData);

  useEffect(() => {
    if (clickedCoords) {
      setControls((prev) => ({ ...prev, targetLat: clickedCoords.lat, targetLon: clickedCoords.lng }));
    }
  }, [clickedCoords]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setControls((prev) => ({ ...prev, [id]: value }));
  };

  const handleSend = () => {
    // Process controls before sending to handle different number formats (e.g., comma as decimal separator).
    const processedControls = Object.entries(controls).reduce((acc, [key, value]) => {
      // If the value is a string, try to convert it to a number.
      if (typeof value === 'string') {
        // Replace comma with period for decimal conversion.
        const sanitizedValue = value.replace(',', '.');
        // Check if it's a valid number, but not an empty string.
        if (sanitizedValue.trim() !== '' && !isNaN(parseFloat(sanitizedValue)) && isFinite(sanitizedValue)) {
          acc[key] = parseFloat(sanitizedValue);
        } else {
          acc[key] = value; // Keep original string if not a valid number
        }
      } else {
        acc[key] = value; // Keep as is if it's already a number or other type
      }
      return acc;
    }, {});

    onSend(processedControls);
  };

  return (
    <div className="panel">
      <h3>Control Panel</h3>
      {Object.entries(controls).map(([key, value]) => (
        <div className="form-group" key={key}>
          <label htmlFor={key}>
            {key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())}
            :
          </label>
          <input
            type="text"
            className="form-control"
            id={key}
            value={value}
            onChange={handleChange}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleSend}
      >
        Send
      </button>
    </div>
  );
};

export default ControlPanel;
