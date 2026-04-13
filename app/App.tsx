import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Kiosk from "./pages/Kiosk";
import Students from "./pages/Student";
import Employees from "./pages/Employees";
import Login from "./pages/Login";
import Navbar from "./pages/Navbar";
import Dashboard from "./pages/Dashboard";
import { authService } from "@/services/api";
import { FingerprintScanner } from "@/pages/FingerprintScanner";
import Announcement from "@/pages/Announcement";
import AttendanceList from "@/pages/AttendanceList";
import ProtectedRoute from "@/components/ProtectedRoute";

// Main Layout with Navbar
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Don't show navbar on login or kiosk pages
  if (location.pathname === "/login" || location.pathname === "/kiosk") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <main className="pt-16">
        {" "}
        {/* Add padding-top for fixed navbar */}
        <div className="container mx-auto px-4 md:px-6 py-6">{children}</div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* Public Route - Redirect to dashboard if already authenticated */}
      <Route
        path="/login"
        element={
          authService.isAuthenticated() ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Kiosk Mode - Full screen, no navbar */}
      <Route
        path="/kiosk"
        element={
          <div className="kiosk-mode">
            <Kiosk />
          </div>
        }
      />

      {/* Fingerprint Scanner - Full screen, no navbar */}
      <Route
        path="/fingerprint"
        element={
          <div className="kiosk-mode">
            <FingerprintScanner />
          </div>
        }
      />

      {/* Student Management - Protected */}
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Students />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Employee Management - Protected */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Employees />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Announcements - Protected */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Announcement />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Attendance List - Protected */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AttendanceList />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Dashboard - Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirect root to kiosk (startup page) */}
      <Route path="/" element={<Navigate to="/kiosk" replace />} />

      {/* Catch all route - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

<style>{`
  .kiosk-mode {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
  }
  
  .kiosk-mode * {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  .kiosk-mode input {
    user-select: text;
    -webkit-user-select: text;
  }
`}</style>;
