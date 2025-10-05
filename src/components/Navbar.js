import React from "react";

const Navbar = () => {
  const handleExit = () => {
    // Implement exit functionality if needed, e.g., closing a window
    // For a web app, this might just navigate away or show a message.
    console.log("Exit button clicked");
    alert("Exit functionality needs implementation.");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container navbar-content">
        <div className="navbar-center">
          <a className="navbar-brand text-center" href="#">
            <h1>GPS-based Boat Control</h1>
          </a>
        </div>
        <button className="btn btn-danger" onClick={handleExit}>
          Exit
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
