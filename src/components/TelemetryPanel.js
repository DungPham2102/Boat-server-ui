import React from "react";

const TelemetryPanel = ({ data }) => {
  return (
    <div className="panel">
      <h3>Telemetry Data</h3>
      {Object.entries(data).map(([key, value]) => (
        <div className="form-group" key={key}>
          <label htmlFor={`current-${key}`}>
            {key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())}
            :
          </label>
          <input
            type="text"
            className="form-control"
            id={`current-${key}`}
            value={value}
            readOnly
          />
        </div>
      ))}
    </div>
  );
};

export default TelemetryPanel;
