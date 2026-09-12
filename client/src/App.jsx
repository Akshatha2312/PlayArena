import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StaffNavbar } from './components/StaffNavbar';
import { AdminNavbar } from './components/AdminNavbar';
import { Footer } from './components/Footer';
import { AppRoutes } from './routes/AppRoutes';
import './index.css';

function MainLayout() {
  const location = useLocation();
  const isStaffRoute = location.pathname.startsWith('/staff');
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {isAdminRoute ? <AdminNavbar /> : isStaffRoute ? <StaffNavbar /> : <Navbar />}
      <main style={{ flex: 1 }}>
        <AppRoutes />
      </main>
      {!isStaffRoute && !isAdminRoute && <Footer />}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
