import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFingerprint } from "@/hooks/useFingerprint";
import { Button } from "@/components/ui/button";
import api, { fingerprintService } from "@/services/api";
import type { Student } from "@/services/api";
import { CheckCircle2, XCircle, ChevronLeft, Fingerprint } from "lucide-react";
// import { attendanceService, studentService } from "@/services/api";
// import { Alert, AlertDescription } from "@/components/ui/alert";

interface AttendanceRecord {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  time: string;
  date: string;
  status: "In" | "Out";
}

const Kiosk = () => {
  const [lastStudent, setLastStudent] = useState<Student | null>(null);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "success" | "error" | "processing"
  >("idle");
  const [message, setMessage] = useState("Position your finger on the scanner");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanCountdown, setScanCountdown] = useState(3);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [hoverExit, setHoverExit] = useState(false);
  const [studentTemplates, setStudentTemplates] = useState<
    Array<{ student_number: string; fingerprint_template: string }>
  >([]);

  // 🔥 FINGERPRINT INTEGRATION
  const {
    state: fingerprintState,
    enumerateDevices,
    startCapture,
    stopCapture,
    clearData,
    verifyWithBackend,
  } = useFingerprint();
  const [fingerprintProcessing, setFingerprintProcessing] = useState(false);

  const navigate = useNavigate();

  const successSound = useRef(new Audio("/sounds/success.mp3"));
  const errorSound = useRef(new Audio("/sounds/error.mp3"));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Request fullscreen on first user interaction
  useEffect(() => {
    const handleFirstInteraction = async () => {
      try {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
          await el.requestFullscreen?.();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn("Fullscreen request failed:", err);
      }

      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch student templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templates = await fingerprintService.getStudentTemplates();
        setStudentTemplates(templates);
        console.log("Student templates loaded:", templates);
      } catch (err) {
        console.error("Failed to fetch student templates:", err);
        setMessage("Failed to load fingerprint templates");
      }
    };
    fetchTemplates();
  }, []);

  // Initialize fingerprint scanner on mount
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        await enumerateDevices();
        await startCapture();
      } catch (err) {
        console.error("Failed to initialize fingerprint scanner:", err);
        setMessage("Fingerprint scanner not available");
      }
    };
    initFingerprint();

    return () => {
      stopCapture().catch(() => {});
    };
  }, [enumerateDevices, startCapture, stopCapture]);

  // Success / Error Effects
  useEffect(() => {
    if (scanStatus === "success") {
      successSound.current.play();
      setShowFingerprintModal(true);

      const countdown = setInterval(() => {
        setScanCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setScanStatus("idle");
            setMessage("Position your finger on the scanner");
            setLastStudent(null);
            setShowFingerprintModal(false);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }

    if (scanStatus === "error") {
      errorSound.current.play();

      // Auto clear error after 1 second
      const errorTimer = setTimeout(() => {
        setScanStatus("idle");
        setMessage("Position your finger on the scanner");
        clearData();
        setFingerprintProcessing(false);
      }, 1000);

      return () => clearTimeout(errorTimer);
    }
  }, [scanStatus]);

  // 🔥 FINGERPRINT SCANNING - Auto-process when fingerprint is captured
  useEffect(() => {
    if (
      fingerprintState.latestIntermediateData &&
      !fingerprintProcessing &&
      scanStatus === "idle"
    ) {
      handleFingerprintScan();
    }
  }, [
    fingerprintState.latestIntermediateData,
    fingerprintProcessing,
    scanStatus,
  ]);

  // 🔥 FINGERPRINT HANDLER - Process fingerprint scan with backend API
  const handleFingerprintScan = async () => {
    if (!fingerprintState.latestIntermediateData) return;

    try {
      setFingerprintProcessing(true);
      setScanStatus("processing");
      setMessage("Identifying student...");

      // 🔥 NEW: backend handles everything
      const matchedStudent = await verifyWithBackend(studentTemplates);

      if (!matchedStudent) {
        throw new Error("Fingerprint not recognized");
      }

      console.log("✓ Fingerprint matched:", matchedStudent.student_number);
      setMessage("Processing attendance...");

      // 🔥 Call attendance API
      const response = await api.post("/attendance/time-in", {
        student_number: matchedStudent.student_number,
      });

      const attendanceData = response.data.attendance;

      setScanStatus("success");
      setMessage(response.data.message || "Time-in recorded successfully!");

      const now = new Date();

      const newRecord = {
        id: attendanceData.id || Date.now().toString(),
        firstName: matchedStudent.first_name,
        lastName: matchedStudent.last_name,
        studentNumber: matchedStudent.student_number,
        time: now.toLocaleTimeString(),
        date: now.toLocaleDateString(),
        status: "In" as const,
      };

      setAttendanceRecords((prev) => [newRecord, ...prev]);
      setLastStudent(matchedStudent);

      setTimeout(() => {
        clearData();
        setFingerprintProcessing(false);
        setScanCountdown(3);
      }, 500);
    } catch (error: any) {
      setScanStatus("error");
      setMessage(error.message || "Fingerprint failed");
      console.error("Fingerprint scan error:", error);
      setFingerprintProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-blue-800 flex items-center justify-center relative overflow-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.8);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-in-out;
        }
        .exit-button {
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }
        .exit-button.show {
          opacity: 1;
        }
      `}</style>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[800px] h-[800px] bg-blue-500/20 blur-3xl rounded-full top-[-300px] left-[-300px] " />
        <div
          className="absolute w-[600px] h-[600px] bg-cyan-400/20 blur-3xl rounded-full bottom-[-200px] right-[-200px] "
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute w-[500px] h-[500px] bg-indigo-400/10 blur-3xl rounded-full top-1/2 left-1/2 "
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Hidden Input */}
      <form onSubmit={(e) => e.preventDefault()} className="opacity-0 absolute">
        <input readOnly />
      </form>

      {/* Exit Button - hover top-left */}
      <div
        className="fixed top-6 left-6 z-50"
        onMouseEnter={() => setHoverExit(true)}
        onMouseLeave={() => setHoverExit(false)}
      >
        <Button
          className={`exit-button bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-105 ${hoverExit ? "show" : ""}`}
          onClick={() => navigate("/dashboard")}
        >
          <ChevronLeft className="mr-2" /> Exit
        </Button>
      </div>

      {/* Clock */}
      <div className="fixed top-6 right-6 text-right">
        <div className="text-2xl font-mono font-bold text-white drop-shadow-lg">
          {currentTime.toLocaleTimeString()}
        </div>
        <div className="text-sm text-blue-100">
          {currentTime.toDateString()}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[calc(100vh-300px)] w-full">
          {/* LEFT COLUMN - Scanner Card */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex flex-col gap-6 h-full overflow-auto">
              {/* Personal Information Card */}
              <div className="bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-xl font-bold text-blue-200 mb-4">
                  Student Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide">
                        First Name
                      </p>
                      <p className="text-base text-white font-bold mt-1">
                        {lastStudent?.first_name || "John"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide">
                        Last Name
                      </p>
                      <p className="text-base text-white font-bold mt-1">
                        {lastStudent?.last_name || "Doe"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide">
                      Student Number
                    </p>
                    <p className="text-base text-white font-bold mt-1">
                      {lastStudent?.student_number || "STU-2024-001"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-base text-white font-bold mt-1">
                      {lastStudent?.email || "john.doe@student.com"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Attendance Card */}
              <div className="bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-xl font-bold text-cyan-200 mb-4">
                  Recent Time In
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-hidden">
                  {attendanceRecords.length === 0 ? (
                    <p className="text-blue-300 text-center py-4 text-sm">
                      No attendance records yet
                    </p>
                  ) : (
                    attendanceRecords.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {record.time}
                            </p>
                            <p className="text-blue-300 text-xs">
                              {record.date}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              record.status === "In"
                                ? "bg-green-500/30 text-green-300"
                                : "bg-orange-500/30 text-orange-300"
                            }`}
                          >
                            {record.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Attendance Information Cards */}
          <div className="lg:col-span-8 bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md flex flex-col items-center justify-center h-full overflow-auto">
            <div className="w-full flex flex-col items-center justify-center">
              {/* Instruction */}
              <p className="text-lg text-blue-100 mb-8 font-medium">
                Position your finger on the scanner to verify attendance
              </p>

              {/* Kiosk Machine with Hand Tapping */}
              <div className="relative mb-8 flex items-center justify-center h-80">
                {/* Animation Styles */}
                <style>{`
                @keyframes scanningBounce {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                }
                @keyframes scanningGlow {
                  0%, 100% { 
                    filter: drop-shadow(0 0 5px rgba(0, 217, 255, 0.5));
                  }
                  50% { 
                    filter: drop-shadow(0 0 20px rgba(0, 217, 255, 1));
                  }
                }
                @keyframes horizontalScanLine {
                  0% {
                    transform: translateY(-120px);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% {
                    transform: translateY(120px);
                    opacity: 0;
                  }
                }
                @keyframes scannerRing {
                  0%, 100% {
                    r: 60px;
                    opacity: 0.3;
                  }
                  50% {
                    r: 100px;
                    opacity: 0;
                  }
                }
                @keyframes scanBoxBorder {
                  0%, 100% {
                    stroke-dashoffset: 0;
                    opacity: 0.4;
                  }
                  50% {
                    stroke-dashoffset: -400;
                    opacity: 0.9;
                  }
                }
                @keyframes cornerScan {
                  0% {
                    opacity: 0;
                    r: 8;
                  }
                  50% {
                    opacity: 1;
                    r: 12;
                  }
                  100% {
                    opacity: 0;
                    r: 8;
                  }
                }
               
                .scanning-line {
                  animation: horizontalScanLine 2s ease-in-out infinite;
                }
                .scanner-ring {
                  animation: scannerRing 2s ease-in-out infinite;
                }
                .scan-box-border {
                  animation: scanBoxBorder 3s ease-in-out infinite;
                }
                .corner-dot {
                  animation: cornerScan 2s ease-in-out infinite;
                }
              `}</style>

                {/* Fingerprint Icon with Scanning Animation */}
                <div className="relative flex items-center justify-center">
                  {/* Scanner Rings */}
                  <svg
                    className="absolute w-64 h-64 pointer-events-none"
                    viewBox="0 0 300 300"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Scanning Box Frame */}
                    <rect
                      x="50"
                      y="50"
                      width="200"
                      height="200"
                      fill="none"
                      stroke="#00d9ff"
                      strokeWidth="2"
                      strokeDasharray="20,10"
                      className="scan-box-border"
                      rx="10"
                    />

                    {/* Corner Dots */}
                    <circle
                      cx="50"
                      cy="50"
                      r="8"
                      fill="#00d9ff"
                      className="corner-dot"
                      opacity="0.6"
                    />
                    <circle
                      cx="250"
                      cy="50"
                      r="8"
                      fill="#00d9ff"
                      className="corner-dot"
                      opacity="0.6"
                      style={{ animationDelay: "0.5s" }}
                    />
                    <circle
                      cx="50"
                      cy="250"
                      r="8"
                      fill="#00d9ff"
                      className="corner-dot"
                      opacity="0.6"
                      style={{ animationDelay: "1s" }}
                    />
                    <circle
                      cx="250"
                      cy="250"
                      r="8"
                      fill="#00d9ff"
                      className="corner-dot"
                      opacity="0.6"
                      style={{ animationDelay: "1.5s" }}
                    />

                    {/* Scanner Rings */}
                    <circle
                      cx="150"
                      cy="150"
                      r="60"
                      fill="none"
                      stroke="#00d9ff"
                      strokeWidth="2"
                      className="scanner-ring"
                      opacity="0.5"
                    />
                  </svg>

                  {/* Scanning Line */}
                  <div
                    className="absolute w-48 h-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent scanning-line"
                    style={{
                      boxShadow: "0 0 15px rgba(0, 217, 255, 0.8)",
                    }}
                  />

                  {/* Fingerprint Icon */}
                  <div className="absolute">
                    <Fingerprint
                      className="w-48 h-60 text-cyan-400 animate-fingerprint-scan"
                      strokeWidth={0.5}
                    />
                  </div>
                </div>
              </div>

              {/* STATUS */}
              {scanStatus === "idle" && (
                <div className="animate-fade-in text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Ready to Scan
                  </h2>
                  <p className="text-base text-blue-100 mt-4 font-medium">
                    {message}
                  </p>
                </div>
              )}

              {scanStatus === "processing" && (
                <div className="animate-fade-in text-center">
                  <div className="w-16 h-16 border-4 border-cyan-300 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                  <h2 className="text-2xl font-bold text-cyan-300">
                    Processing...
                  </h2>
                </div>
              )}

              {scanStatus === "error" && (
                <div className="space-y-4 animate-fade-in text-center">
                  <XCircle className="h-20 w-20 text-red-400 mx-auto drop-shadow-lg" />
                  <h2 className="text-2xl font-bold text-red-300">
                    Scan Failed
                  </h2>
                  <p className="text-base text-red-200">{message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fingerprint Success Modal */}
      {showFingerprintModal && lastStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-green-900/95 to-emerald-900/95 border-2 border-green-400 rounded-3xl p-12 text-center max-w-2xl backdrop-blur-2xl shadow-2xl">
            <CheckCircle2 className="h-28 w-28 text-green-400 mx-auto mb-8 animate-bounce drop-shadow-lg" />

            <h2 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
              {lastStudent.first_name} {lastStudent.last_name}
            </h2>

            <p className="text-2xl text-green-300 font-semibold mb-8 drop-shadow-lg">
              {lastStudent.student_number}
            </p>

            <div className="bg-green-500/20 border border-green-400 rounded-2xl p-6 mb-8">
              <p className="text-lg text-green-100 font-semibold mb-4">
                {message}
              </p>
              <p className="text-4xl font-bold text-green-300">
                {scanCountdown}s
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-green-900/90 to-emerald-900/90 border border-green-400/50 rounded-3xl p-12 text-center max-w-md backdrop-blur-2xl shadow-2xl transform">
            <CheckCircle2 className="h-24 w-24 text-green-400 mx-auto mb-6 animate-pulse drop-shadow-lg" />
            <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              Attendance Recorded!
            </h2>
            <p className="text-lg text-green-200 font-semibold">
              Processing your information...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kiosk;
