import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ChevronLeft } from "lucide-react";
import { attendanceService, studentService } from "@/services/api";
import type { Student } from "@/services/api";

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
  const [rfid, setRfid] = useState("");
  const [lastStudent, setLastStudent] = useState<Student | null>(null);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "success" | "error" | "processing"
  >("idle");
  const [message, setMessage] = useState(
    "Scan your RFID card on the scanner device",
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanCountdown, setScanCountdown] = useState(5);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [hoverExit, setHoverExit] = useState(false); // hover state for exit button

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const successSound = useRef(new Audio("/sounds/success.mp3"));
  const errorSound = useRef(new Audio("/sounds/error.mp3"));

  // Fullscreen
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.();

    const reEnter = () => {
      if (!document.fullscreenElement) el.requestFullscreen?.();
    };

    document.addEventListener("fullscreenchange", reEnter);
    return () => document.removeEventListener("fullscreenchange", reEnter);
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Autofocus
  useEffect(() => {
    const focusInterval = setInterval(() => inputRef.current?.focus(), 100);
    return () => clearInterval(focusInterval);
  }, []);

  // Success / Error Effects
  useEffect(() => {
    if (scanStatus === "success") {
      successSound.current.play();

      const countdown = setInterval(() => {
        setScanCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setScanStatus("idle");
            setMessage("Scan your RFID card on the scanner device");
            setLastStudent(null);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }

    if (scanStatus === "error") {
      errorSound.current.play();
    }
  }, [scanStatus]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfid.trim()) return;

    try {
      setScanStatus("processing");
      setMessage("Processing RFID scan...");

      const res = await attendanceService.timeIn(rfid);

      if (res.attendance) {
        setScanStatus("success");
        setMessage(
          `Time IN recorded at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        );

        const students = await studentService.getAllStudents();
        const student = students.find(
          (s: Student) => s.rfid_tag_number === rfid,
        );
        if (student) setLastStudent(student);

        setRfid("");
        return;
      }
    } catch {
      try {
        const res = await attendanceService.timeOut(rfid);

        if (res.attendance) {
          setScanStatus("success");
          setMessage(`Time OUT recorded`);
          setRfid("");
        }
      } catch {
        setScanStatus("error");
        setMessage("Scan failed. Please try again.");
      }
    }
  };

  const handleTestClick = () => {
    setShowSuccessModal(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const dateString = now.toLocaleDateString();
    const status = Math.random() > 0.5 ? "In" : "Out";


    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      firstName: "John",
      lastName: "Doe",
      studentNumber: "STU-2024-001",
      time: timeString,
      date: dateString,
      status: status,
    };
    setAttendanceRecords((prev) => [newRecord, ...prev]);

    setTimeout(() => {
      setShowSuccessModal(false);
    }, 1000);
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
         @keyframes cardSwipe {
  0% {
    transform: translateX(20px) rotate(-2deg);
  }
  40% {
    transform: translateX(-80px) rotate(-2deg);
  }
  60% {
    transform: translateX(-80px) rotate(-2deg);
  }
  100% {
    transform: translateX(20px) rotate(-2deg);
  }
}
      `}</style>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[800px] h-[800px] bg-blue-500/20 blur-3xl rounded-full top-[-300px] left-[-300px] animate-pulse" />
        <div
          className="absolute w-[600px] h-[600px] bg-cyan-400/20 blur-3xl rounded-full bottom-[-200px] right-[-200px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute w-[500px] h-[500px] bg-indigo-400/10 blur-3xl rounded-full top-1/2 left-1/2 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Hidden Input */}
      <form onSubmit={handleScan} className="opacity-0 absolute">
        <input
          ref={inputRef}
          value={rfid}
          onChange={(e) => setRfid(e.target.value)}
          autoFocus
        />
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
                Tap your RFID card on the scanner device
              </p>

              {/* Kiosk Machine with Hand Tapping */}
              <div className="relative mb-8 flex items-center justify-center h-80">
                <style>{`
              @keyframes cardTap {
                0%, 100% { transform: translateX(0) translateY(0); }
                50% { transform: translateX(-20px) translateY(-5px); }
              }
              
              @keyframes nfcPulse {
                0%, 100% { opacity: 0.3; r: 45px; }
                50% { opacity: 0.6; r: 65px; }
              }
              
              @keyframes nfcWave {
                0%, 100% { opacity: 0; r: 30px; }
                50% { opacity: 0.6; r: 80px; }
              }
            `}</style>

                {/* NFC Card Reader Device */}
                <svg
                  viewBox="0 0 300 400"
                  className="w-64 h-80 drop-shadow-2xl relative z-10 cursor-pointer hover:drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 transform hover:scale-105"
                  preserveAspectRatio="xMidYMid meet"
                  onClick={handleTestClick}
                >
                  {/* Device Body */}
                  <rect
                    x="30"
                    y="40"
                    width="240"
                    height="320"
                    rx="25"
                    fill="#1e3a5f"
                    stroke="#60a5fa"
                    strokeWidth="3"
                  />

                  {/* Top Rounded Corners - Detail */}
                  <rect
                    x="35"
                    y="45"
                    width="230"
                    height="40"
                    rx="20"
                    fill="#0f172a"
                    opacity="0.5"
                  />

                  {/* Screen Area */}
                  <rect
                    x="50"
                    y="80"
                    width="200"
                    height="150"
                    rx="15"
                    fill="#0f172a"
                    stroke="#475569"
                    strokeWidth="2"
                  />

                  {/* Screen Inner Glow */}
                  <rect
                    x="55"
                    y="85"
                    width="190"
                    height="140"
                    rx="12"
                    fill="#1e293b"
                    opacity="0.6"
                  />

                  {/* Top Blue Accent Line */}
                  <rect
                    x="55"
                    y="85"
                    width="190"
                    height="20"
                    rx="10"
                    fill="#3b82f6"
                    opacity="0.3"
                  />

                  {/* NFC Symbol - Center of Device */}
                  <g>
                    {/* Outer Circle */}
                    <circle
                      cx="150"
                      cy="155"
                      r="35"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="3"
                      opacity="0.8"
                    />
                    {/* Middle Circle */}
                    <circle
                      cx="150"
                      cy="155"
                      r="25"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    {/* Inner Circle */}
                    <circle
                      cx="150"
                      cy="155"
                      r="8"
                      fill="#60a5fa"
                      opacity="0.8"
                    />
                    {/* Top Right Wave */}
                    <path
                      d="M 165 140 Q 175 135 180 145"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      opacity="0.7"
                    />
                    {/* Bottom Right Wave */}
                    <path
                      d="M 168 165 Q 178 170 185 165"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      opacity="0.7"
                    />
                  </g>

                  {/* Animated NFC Pulse Rings */}
                  <circle
                    cx="150"
                    cy="155"
                    r="45"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    opacity="0.3"
                    style={{
                      animation: "nfcPulse 1.5s ease-out infinite",
                    }}
                  />

                  {/* Animated NFC Pulse Wave */}
                  <circle
                    cx="150"
                    cy="155"
                    r="30"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="1.5"
                    opacity="0"
                    style={{
                      animation: "nfcWave 1.5s ease-out infinite",
                    }}
                  />

                  {/* Bottom Panel */}
                  <rect
                    x="30"
                    y="300"
                    width="240"
                    height="60"
                    rx="15"
                    fill="#0f172a"
                    stroke="#60a5fa"
                    strokeWidth="2"
                  />

                  {/* Status Light */}
                  <circle cx="60" cy="330" r="6" fill="#10b981" opacity="0.8" />
                  <circle
                    cx="60"
                    cy="330"
                    r="6"
                    fill="#10b981"
                    opacity="0.4"
                    style={{
                      animation: "nfcPulse 1s ease-in-out infinite",
                    }}
                  />
                </svg>

                {/* Card Animation with RFID Text */}
                <svg
                  viewBox="0 0 300 200"
                  className="absolute w-72 h-40 drop-shadow-2xl"
                  style={{
                    left: "-80px",
                    top: "60px",
                    animation: "cardSwipe 1.5s ease-in-out infinite",
                    zIndex: 20,
                  }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Card - Front */}
                  <rect
                    x="20"
                    y="20"
                    width="260"
                    height="160"
                    rx="16"
                    fill="#ffffff"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    filter="drop-shadow(0 8px 24px rgba(0,0,0,0.3))"
                  />

                  {/* Card Shine */}
                  <rect
                    x="20"
                    y="20"
                    width="260"
                    height="40"
                    rx="16"
                    fill="#f3f4f6"
                    opacity="0.6"
                  />

                  {/* RFID Text */}
                  <text
                    x="150"
                    y="115"
                    textAnchor="middle"
                    fontSize="28"
                    fontWeight="bold"
                    fill="#1e293b"
                    fontFamily="Arial, sans-serif"
                  >
                    RFID
                  </text>

                  {/* Card Chip */}
                  <rect
                    x="40"
                    y="70"
                    width="40"
                    height="40"
                    rx="4"
                    fill="#fbbf24"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="50"
                    y1="70"
                    x2="50"
                    y2="110"
                    stroke="#f59e0b"
                    strokeWidth="0.6"
                  />
                  <line
                    x1="60"
                    y1="70"
                    x2="60"
                    y2="110"
                    stroke="#f59e0b"
                    strokeWidth="0.6"
                  />
                  <line
                    x1="70"
                    y1="70"
                    x2="70"
                    y2="110"
                    stroke="#f59e0b"
                    strokeWidth="0.6"
                  />

                  {/* Card Shadow Overlay */}
                  <rect
                    x="20"
                    y="20"
                    width="260"
                    height="160"
                    rx="16"
                    fill="none"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="8"
                  />
                </svg>
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

              {scanStatus === "success" && lastStudent && (
                <div className="space-y-4 animate-fade-in text-center">
                  <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto animate-bounce drop-shadow-lg" />

                  <div>
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                      {lastStudent.first_name} {lastStudent.last_name}
                    </h2>

                    <p className="text-lg text-green-300 font-semibold mt-2 drop-shadow-lg">
                      {lastStudent.student_number}
                    </p>
                  </div>

                  <Alert className="bg-green-500/20 border-green-400 backdrop-blur-md text-left">
                    <AlertDescription className="text-white font-semibold text-sm">
                      {message}
                      <div className="mt-3 text-base font-bold text-green-300">
                        Next scan in {scanCountdown}s
                      </div>
                    </AlertDescription>
                  </Alert>
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
