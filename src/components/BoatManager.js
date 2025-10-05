import React, { useState } from "react";

function BoatManager({ boats, setBoats }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentBoat, setCurrentBoat] = useState(null);
  const [formData, setFormData] = useState({ name: "", boatId: "" });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAdd = () => {
    fetch("http://localhost:3001/api/boats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((newBoat) => {
        setBoats([...boats, newBoat]);
        setFormData({ name: "", boatId: "" });
      });
  };

  const handleUpdate = () => {
    fetch(`http://localhost:3001/api/boats/${currentBoat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((updatedBoat) => {
        setBoats(boats.map((b) => (b.id === updatedBoat.id ? updatedBoat : b)));
        setIsEditing(false);
        setCurrentBoat(null);
        setFormData({ name: "", boatId: "" });
      });
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:3001/api/boats/${id}`, { method: "DELETE" }).then(
      () => {
        setBoats(boats.filter((b) => b.id !== id));
      }
    );
  };

  const handleEditClick = (boat) => {
    setIsEditing(true);
    setCurrentBoat(boat);
    setFormData({ name: boat.name, boatId: boat.boatId });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setCurrentBoat(null);
              setFormData({ name: "", boatId: "" });
            }}
          >
            Cancel
          </button>
        )}
      </form>
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
