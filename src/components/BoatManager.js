import React, { useState } from "react";

function BoatManager({ boats, setBoats, serverIp }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentBoat, setCurrentBoat] = useState(null);
  const [formData, setFormData] = useState({ name: "", boatId: "" });
  const [notification, setNotification] = useState({ type: "", message: "" });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: "", message: "" }), 5000);
  };

  const handleAdd = () => {
    fetch(`http://${serverIp}:3001/api/boats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errData.error || `Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((newBoat) => {
        setBoats([...boats, newBoat]);
        setFormData({ name: "", boatId: "" });
        showNotification("success", "Boat added successfully!");
      })
      .catch(error => {
        showNotification("error", error.message);
      });
  };

  const handleUpdate = () => {
    fetch(`http://${serverIp}:3001/api/boats/${currentBoat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errData.error || `Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((updatedBoat) => {
        setBoats(boats.map((b) => (b.id === updatedBoat.id ? updatedBoat : b)));
        setIsEditing(false);
        setCurrentBoat(null);
        setFormData({ name: "", boatId: "" });
        showNotification("success", "Boat updated successfully!");
      })
      .catch(error => {
        showNotification("error", error.message);
      });
  };

  const handleDelete = (id) => {
    fetch(`http://${serverIp}:3001/api/boats/${id}`, { method: "DELETE" }).then(
      (res) => {
        if (res.ok) {
          setBoats(boats.filter((b) => b.id !== id));
          showNotification("success", "Boat deleted successfully!");
        } else {
          showNotification("error", "Failed to delete boat.");
        }
      }
    );
  };

  const handleEditClick = (boat) => {
    setIsEditing(true);
    setCurrentBoat(boat);
    setFormData({ name: boat.name, boatId: boat.boatId });
    setNotification({ type: "", message: "" }); // Clear notification
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentBoat(null);
    setFormData({ name: "", boatId: "" });
    setNotification({ type: "", message: "" }); // Clear notification
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotification({ type: "", message: "" }); // Clear notification
    if (isEditing) {
      handleUpdate();
    } else {
      handleAdd();
    }
  };

  return (
    <div className="boat-manager-container">
      <h3>Boat Management</h3>
      <form onSubmit={handleSubmit} className="boat-manager-form">
        <input
          type="text"
          name="name"
          placeholder="Boat Name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="boatId"
          placeholder="Boat ID"
          value={formData.boatId}
          onChange={handleInputChange}
          required
        />
        <button type="submit">{isEditing ? "Update Boat" : "Add Boat"}</button>
        {isEditing && (
          <button type="button" onClick={handleCancelEdit}>
            Cancel
          </button>
        )}
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
            <th>Boat ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {boats.map((boat) => (
            <tr key={boat.id}>
              <td>{boat.name}</td>
              <td>{boat.boatId}</td>
              <td className="boat-manager-actions">
                <button onClick={() => handleEditClick(boat)}>Edit</button>
                <button onClick={() => handleDelete(boat.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BoatManager;
