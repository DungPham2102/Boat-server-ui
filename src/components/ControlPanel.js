import React, { useState } from "react";

const ControlPanel = ({ initialData, onSend }) => {
  const [controls, setControls] = useState(initialData);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setControls((prev) => ({ ...prev, [id]: value }));
  };

  const handleSend = () => {
    onSend(controls);
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
