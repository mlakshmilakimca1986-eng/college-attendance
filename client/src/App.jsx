import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import AdminDashboard from './components/AdminDashboard';
import PrincipalDashboard from './components/PrincipalDashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    if (token) {
      setUser({ token, role, name });
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const Logout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen">
      {user.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <PrincipalDashboard />
      )}
    </div>
  );
}

export default App;
