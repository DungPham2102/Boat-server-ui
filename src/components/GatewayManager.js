import React, { useState, useEffect } from "react";

function GatewayManager({ serverIp, token, gateways, setGateways }) {
  const [formData, setFormData] = useState({ name: "", gatewayId: "" });
  const [notification, setNotification] = useState({ type: "", message: "" });

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: "", message: "" }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAdd = () => {
    fetch(`http://${serverIp}:3001/api/gateways`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errData.error || `Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((newGateway) => {
        setGateways([...gateways, newGateway]);
        setFormData({ name: "", gatewayId: "" });
        showNotification("success", "Gateway added successfully!");
      })
      .catch(error => {
        showNotification("error", error.message);
      });
  };

  const handleDelete = (id) => {
    fetch(`http://${serverIp}:3001/api/gateways/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setGateways(gateways.filter((gw) => gw.id !== id));
          showNotification("success", "Gateway deleted successfully!");
        } else {
          res.json().then(err => {
            showNotification("error", err.message || "Failed to delete gateway.");
          }).catch(() => {
            showNotification("error", "Failed to delete gateway.");
          });
        }
      })
      .catch(error => {
        showNotification("error", error.message);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotification({ type: "", message: "" });
    handleAdd();
  };

  return (
    <div className="boat-manager-container">
      <h3>Gateway Management</h3>
      <form onSubmit={handleSubmit} className="boat-manager-form">
        <input
          type="text"
          name="name"
          placeholder="Gateway Name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="gatewayId"
          placeholder="Gateway ID"
          value={formData.gatewayId}
          onChange={handleInputChange}
          required
        />
        
        <button type="submit">Add Gateway</button>
      </form>
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      <table className="boat-manager-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Gateway ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {gateways.map((gw) => (
            <tr key={gw.id}>
              <td>{gw.name}</td>
              <td>{gw.gatewayId}</td>
              <td className="boat-manager-actions">
                <button onClick={() => handleDelete(gw.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GatewayManager;
