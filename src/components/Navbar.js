import React from "react";

const Navbar = ({ onLogout }) => {

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container navbar-content">
        <div className="navbar-center">
          <div className="navbar-brand text-center">
            <h1>GPS-based Boat Control</h1>
          </div>
        </div>
        <button className="btn btn-danger" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
