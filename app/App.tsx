import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import Kiosk from "./pages/Kiosk";
import StudentList from "./pages/Student";
import Login from "./pages/Login";
import Navbar from "./pages/Navbar";
import { authService } from "@/services/api";
import {FingerprintScanner} from "@/pages/FingerprintScanner";

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
      <main className="pt-16"> {/* Add padding-top for fixed navbar */}
        <div className="container mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Kiosk Mode - Full screen, no navbar */}
      <Route path="/kiosk" element={

        <div className="kiosk-mode">
          <Kiosk />
        </div>
      } />

      {/* Fingerprint Scanner - Full screen, no navbar */}
      <Route path="/fingerprint" element={

        <div className="kiosk-mode">  
          <FingerprintScanner />
        </div>
      } />

      {/* Student Management */}
      <Route path="/students" element={

        <MainLayout>
          <StudentList />
        </MainLayout>
      } />

      {/* Dashboard */}
      <Route path="/dashboard" element={
        authService.isAuthenticated() ? (
          <MainLayout>
            <div className="text-center py-6 md:py-10">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Welcome to SAS Admin
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                Student Attendance System - Manage students and monitor attendance
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Link
                  to="/students"
                  className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 text-left no-underline"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-11.75A8.97 8.97 0 0012 4c-2.343 0-4.518.826-6.25 2.194" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Manage Students</h3>
                      <p className="text-sm text-slate-500">View, add, edit student records</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/kiosk"
                  className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-300 text-left no-underline"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Kiosk Mode</h3>
                      <p className="text-sm text-slate-500">Full-screen attendance scanner</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </MainLayout>
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* Dashboard route alias */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* Redirect authenticated users from login to dashboard */}
      <Route path="/login" element={
        authService.isAuthenticated() ?
          <Navigate to="/dashboard" replace /> :
          <Login />
      } />

      {/* Catch all route */}
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
`}</style>