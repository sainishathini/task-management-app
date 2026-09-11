// Dashboard home page
// Shows boards and user info
// Placeholder for now

import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Dashboard</h1>
      <p>Welcome {user?.name || 'User'}!</p>
      <p>Boards coming soon...</p>
      <button
        type="button"
        onClick={logout}
        className="btn-primary"
        style={{ width: 'auto', padding: '0.6rem 1.25rem', marginTop: '1rem' }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
