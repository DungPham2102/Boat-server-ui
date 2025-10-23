import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleLogin = async () => {
    try {
      const apiUrl = `http://${window.location.hostname}:3001/api/login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const { accessToken } = await response.json();
        onLoginSuccess(accessToken);
      } else {
        const errorText = await response.text();
        setError(errorText || 'Login failed!');
      }
    } catch (err) {
      setError('Network error. Could not connect to the server.');
      console.error('Login fetch error:', err);
    }
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const apiUrl = `http://${window.location.hostname}:3001/api/register`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const responseText = await response.text();
      if (response.ok) {
        setMessage(responseText + ' You can now log in.');
        setError('');
        setIsRegisterMode(false); // Switch back to login mode
        // Clear fields after successful registration
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(responseText || 'Registration failed!');
      }
    } catch (err) {
      setError('Network error. Could not connect to the server.');
      console.error('Registration fetch error:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isRegisterMode) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setMessage('');
    // Clear fields when toggling
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h2 style={styles.title}>{isRegisterMode ? 'Register' : 'Login'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label htmlFor="username" style={styles.label}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          {isRegisterMode && (
            <div style={styles.inputGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          )}
          {error && <p style={styles.errorText}>{error}</p>}
          {message && <p style={styles.messageText}>{message}</p>}
          <button type="submit" style={styles.button}>
            {isRegisterMode ? 'Register' : 'Sign In'}
          </button>
        </form>
        <button onClick={toggleMode} style={styles.toggleButton}>
          {isRegisterMode ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
};

// Basic styling to make it look decent
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f2f5',
  },
  loginBox: {
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    marginBottom: '24px',
    color: '#333',
    fontSize: '24px',
  },
  inputGroup: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '16px',
  },
  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  errorText: {
    color: 'red',
    marginTop: '-10px',
    marginBottom: '15px',
  },
  messageText: {
    color: 'green',
    marginTop: '-10px',
    marginBottom: '15px',
  },
  toggleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    marginTop: '15px',
    padding: '0',
    fontSize: '14px',
  },
};

export default Login;
