import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { attendanceService, announcementService } from "@/services/api";
import "@/css/global.css";

interface ScannedStudent {
  first_name: string;
  last_name: string;
  time_in: string;
}

interface RecentRecord {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture_url?: string | null;
  time_in: string;
  time_out?: string;
}

const Kiosk = () => {
  const [rfid, setRfid] = useState("");
  const [scannedStudent, setScannedStudent] = useState<ScannedStudent | null>(
    null,
  );
  const [activeModal, setActiveModal] = useState<"scanned" | "error" | "wait" | null>(null);
  const [notRegisteredMessage, setNotRegisteredMessage] = useState("");
  const [waitMessage, setWaitMessage] = useState("");
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [approachingMessage, setApproachingMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Not Registered");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset inactivity timeout
  const resetInactivityTimer = () => {
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Set new timeout for 2 minutes (120000 ms)
    setShowWelcome(false);
    inactivityTimeoutRef.current = setTimeout(() => {
      setShowWelcome(true);
    }, 30000);
  };

  // Close all modals
  const closeAllModals = () => {
  if (modalTimeoutRef.current) {
    clearTimeout(modalTimeoutRef.current);
    modalTimeoutRef.current = null;
  }

  setActiveModal(null);
  setApproachingMessage("");
  setNotRegisteredMessage("");
  setWaitMessage("");
  setErrorTitle("Not Registered");
  setIsProcessing(false);

  // Refocus RFID input
  setTimeout(() => {
    inputRef.current?.focus();
  }, 100);
};

  useEffect(() => {
    inputRef.current?.focus();
    updateDateTime();
    loadRecentRecords();
    loadAnnouncements();

    // Initialize inactivity timer
    resetInactivityTimer();

    // Request fullscreen mode when component mounts
    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } catch (error) {
        console.log('Fullscreen request failed or was denied:', error);
      }
    };

    requestFullscreen();

    // Add keyboard listener for Ctrl+F12 to access login and F11 to toggle fullscreen
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'F12') {
        event.preventDefault();
        
        // Exit fullscreen before navigating
        if (document.fullscreenElement) {
          document.exitFullscreen().then(() => {
            navigate('/login');
          });
        } else {
          navigate('/login');
        }
      }
      // F11 to toggle fullscreen manually
      if (event.key === 'F11') {
        event.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          requestFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    const interval = setInterval(() => {
      updateDateTime();
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
      if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      
      // Exit fullscreen when leaving the page
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [navigate]);

  const updateDateTime = () => {
    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
    setCurrentTime(
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  };

  const loadRecentRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await attendanceService.getRecentAttendance();

      if (Array.isArray(response)) {
        const records: RecentRecord[] = response
          .map((record: any) => {
            let firstName = "";
            let lastName = "";
            let profilePictureUrl = null;

            // Handle student records
            if (record.type === 'student') {
              firstName = record.first_name || "";
              lastName = record.last_name || "";
              profilePictureUrl = record.profile_picture_url || null;
            } 
            // Handle employee records
            else if (record.type === 'employee') {
              // For employees, we might not have first/last names, so use a placeholder or empty
              firstName = record.first_name || record.employee_number || "";
              lastName = record.last_name || "";
              profilePictureUrl = null; // Employees don't have profile pictures in this endpoint
            }
            // Fallback for old format
            else {
              firstName = record.student?.first_name || record.first_name || "";
              lastName = record.student?.last_name || record.last_name || "";
              profilePictureUrl = record.profile_picture_url || record.student?.profile_picture || null;
            }

            return {
              id: record.id,
              first_name: firstName,
              last_name: lastName,
              profile_picture_url: profilePictureUrl,
              time_in: record.time_in || record.created_at,
              time_out: record.time_out || undefined,
            };
          })
          // Already sorted by API, but sort again to be safe
          .sort((a, b) => {
            const timeA = new Date(a.time_out || a.time_in).getTime();
            const timeB = new Date(b.time_out || b.time_in).getTime();
            return timeB - timeA; // Most recent first
          });
        setRecentRecords(records);
      }
    } catch (error) {
      console.error("Error loading recent records:", error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await announcementService.getAnnouncements();

      if (Array.isArray(response)) {
        const announcementTexts = response
          .map(
            (announcement: any) =>
              announcement.title || announcement.content || "",
          )
          .filter((text: string) => text.trim() !== "");
        setAnnouncements(announcementTexts);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    }
  };

  const playSound = (type: "success" | "error") => {
    const audio = new Audio(
      type === "success" ? "/sounds/success.mp3" : "/sounds/error.mp3",
    );
    audio.play().catch(() => { });
  };

 const handleScan = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!rfid.trim() || isProcessing) return;

  setRfid("");
  setIsProcessing(true);

  try {
    const result = await attendanceService.timeIn(rfid);
    console.log("RFID Scan Result:", result);

    const isSuccess =
      result?.isSuccess ||
      result?.status === "success" ||
      result?.success === true ||
      !!result?.attendance;

    // Check if we have attendance data - for both students and employees
    const hasAttendance = !!result?.attendance || (result?.student) || (result?.employee);
    
    if (isSuccess && hasAttendance) {
      playSound("success");
      resetInactivityTimer();

      const attendance = result.attendance;

      let studentData: ScannedStudent | null = null;

      // ✅ FIX: DO NOT overwrite later
      if (result?.message && result.message.toLowerCase().includes("5")) {
        setApproachingMessage(result.message);
      } else {
        setApproachingMessage("");
      }

      // Try to get student data from different possible response structures
      if (result.student) {
        // Student object exists in response
        studentData = {
          first_name: result.student.first_name || "",
          last_name: result.student.last_name || "",
          time_in: attendance?.time_in || result.student.time_in || new Date().toISOString(),
        };
      } else if (result.employee) {
        // Employee object exists in response
        studentData = {
          first_name: result.employee.first_name || result.employee.employee_number || "",
          last_name: result.employee.last_name || "",
          time_in: attendance?.time_in || result.employee.time_in || new Date().toISOString(),
        };
      } else if (attendance?.first_name && attendance?.last_name) {
        // Data in attendance object
        studentData = {
          first_name: attendance.first_name || "",
          last_name: attendance.last_name || "",
          time_in: attendance.time_in || new Date().toISOString(),
        };
      } else if (attendance?.first_name || attendance?.last_name || attendance?.employee_number) {
        // Fallback for employee records or incomplete data
        studentData = {
          first_name: attendance.first_name || attendance.employee_number || "",
          last_name: attendance.last_name || "",
          time_in: attendance.time_in || new Date().toISOString(),
        };
      }

      if (studentData && (studentData.first_name || studentData.last_name)) {
        // CLEAR old timeout completely
        if (modalTimeoutRef.current) {
          clearTimeout(modalTimeoutRef.current);
          modalTimeoutRef.current = null;
        }

        // Clear other states (DO NOT clear approachingMessage here)
        setNotRegisteredMessage("");
        setWaitMessage("");
        setErrorTitle("Not Registered");
        setScannedStudent(studentData);
        setActiveModal("scanned");

        console.log("Modal shown for:", studentData.first_name, studentData.last_name);

        // Set timeout to close modal after 1500ms
        modalTimeoutRef.current = setTimeout(() => {
          closeAllModals();
          inputRef.current?.focus();
        }, 1500);
      }

      await loadRecentRecords();
    } else {
      playSound("error");
      const errorMessage = result?.message || "Student not registered";

      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }

      // Clear scannedStudent for error cases
      setScannedStudent(null);

      if (
        errorMessage.toLowerCase().includes("please wait") &&
        errorMessage.toLowerCase().includes("minute")
      ) {
        setNotRegisteredMessage("");
        setApproachingMessage("");
        setWaitMessage(errorMessage);
        setActiveModal("wait");

        modalTimeoutRef.current = setTimeout(() => {
          closeAllModals();
          inputRef.current?.focus();
        }, 2500);
      } else {
        setWaitMessage("");
        setApproachingMessage("");

        if (errorMessage.toLowerCase().includes("already timed in and out")) {
          setErrorTitle("Attendance Completed");
        } else if (errorMessage.toLowerCase().includes("rfid")) {
          setErrorTitle("RFID Not Recognized");
        } else {
          setErrorTitle("Not Registered");
        }

        setNotRegisteredMessage(errorMessage);
        setActiveModal("error");

        modalTimeoutRef.current = setTimeout(() => {
          closeAllModals();
          inputRef.current?.focus();
        }, 1500);
      }
    }
  } catch (error: any) {
    console.error("RFID Scan Error:", error);
    playSound("error");

    let errorMessage = "Student not registered";

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      modalTimeoutRef.current = null;
    }

    // Clear scannedStudent for error cases
    setScannedStudent(null);

    if (
      errorMessage.toLowerCase().includes("please wait") &&
      errorMessage.toLowerCase().includes("minute")
    ) {
      setNotRegisteredMessage("");
      setApproachingMessage("");

      setWaitMessage(errorMessage);
      setActiveModal("wait");

      modalTimeoutRef.current = setTimeout(() => {
        closeAllModals();
        inputRef.current?.focus();
      }, 2500);
    } else {
      setWaitMessage("");
      setApproachingMessage("");

      if (errorMessage.toLowerCase().includes("rfid")) {
        setErrorTitle("RFID Not Recognized");
      } else {
        setErrorTitle("Not Registered");
      }

      setNotRegisteredMessage(errorMessage);
      setActiveModal("error");

      modalTimeoutRef.current = setTimeout(() => {
        closeAllModals();
        inputRef.current?.focus();
      }, 1500);
    }
  } finally {
    // ALWAYS reset processing here
    setIsProcessing(false);
  }
};

  const formatTimeIn = (time: string | null) => {
    if (!time) return "N/A";
    return new Date(time.replace(" ", "T")).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getImageUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;

    // Clean escaped slashes
    const cleanPath = path.replace(/\\/g, '');

    // If already full URL
    if (cleanPath.startsWith('http')) return cleanPath;

    return `https://api-sas.slarenasitsolutions.com/public/${cleanPath}`;
  };

  // Handle card click to show modal
  const handleCardClick = (record: RecentRecord) => {
    console.log("Card clicked:", record);
    
    // Validate record has required data
    if (!record || !record.first_name) {
      console.warn("Invalid record data for card click");
      return;
    }

    const studentData: ScannedStudent = {
      first_name: record.first_name || "",
      last_name: record.last_name || "",
      time_in: record.time_in || new Date().toISOString(),
    };

    // Clear any existing timeouts
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      modalTimeoutRef.current = null;
    }

    // Clear all other messages and state
    setNotRegisteredMessage("");
    setWaitMessage("");
    setErrorTitle("Not Registered");
    setApproachingMessage("");
    setIsProcessing(false);
    
    // Show scanned modal
    setScannedStudent(studentData);
    setActiveModal("scanned");

    console.log("Modal displayed for:", studentData.first_name, studentData.last_name);

    // Set timeout to close modal after 1500ms
    modalTimeoutRef.current = setTimeout(() => {
      closeAllModals();
      inputRef.current?.focus();
    }, 1500);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 flex flex-col overflow-hidden relative">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>

      {/* Hidden Input */}
      <form onSubmit={handleScan} className="opacity-0 absolute">
        <input
          ref={inputRef}
          autoFocus
          value={rfid}
          onChange={(e) => setRfid(e.target.value)}
        />
      </form>

      {/* EXIT BUTTON */}
      {/* <div className="absolute top-6 right-6 z-70">
        <div className="opacity-0 hover:opacity-100 transition-opacity duration-300 ">
          <Button onClick={() => navigate("/dashboard")}>
            <ChevronLeft className="mr-2" /> Exit
          </Button>
        </div>
      </div> */}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {showWelcome || (!loadingRecords && recentRecords.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="inline-flex items-center justify-center p-5 bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10 rounded-3xl mb-8 shadow-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-16 h-16 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-4">
              Welcome to
            </h1>
            <p className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-8">
              Attendance System
            </p>
            <p className="text-xl text-white/70 mb-6 max-w-md">
              Please scan your RFID card to check in
            </p>
            <div className="flex flex-col items-center gap-2">
              <p className="text-white/50">{currentDate}</p>
              <p className="text-3xl font-bold text-blue-400">{currentTime}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-6 h-full pb-2 overflow-auto">
            {[0, 1, 2, 3].map((index) => {
              const record = recentRecords[index];
              if (!loadingRecords && !record) return null;

              return (
                <div
                  key={index}
                  onClick={() => record && handleCardClick(record)}
                  className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl hover:shadow-3xl flex items-start justify-start p-10 transition-all duration-300 hover:border-white/20 hover:bg-gradient-to-br hover:from-white/20 hover:to-white/10 cursor-pointer"
                >
                  {loadingRecords ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <p className="text-white/60 text-lg">Loading...</p>
                    </div>
                  ) : record ? (
                    <div className="w-full flex gap-10">
                      {/* Left Column - Avatar and Name */}
                      <div className="flex flex-col items-center justify-start flex-shrink-0">
                        {record.profile_picture_url ? (
                          <img
                            src={
                              getImageUrl(record.profile_picture_url) ||
                              `https://ui-avatars.com/api/?name=${record.first_name}+${record.last_name}`
                            }
                            alt="Profile"
                            className="w-45 h-45 rounded-full shadow-2xl border-2 border-white/20 object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${record.first_name}+${record.last_name}&background=3b82f6&color=fff`;
                            }}
                          />
                        ) : (
                          <img
                            src={`https://ui-avatars.com/api/?name=${record.first_name}+${record.last_name}&background=3b82f6&color=fff`}
                            className="w-45 h-45 rounded-full shadow-2xl border-2 border-white/20 object-cover"
                            alt="Avatar"
                          />
                        )}
                      </div>

                      {/* Right Column - Time In/Out Details */}
                      <div className="flex-1 flex flex-col gap-4 justify-start">
                        <div className="flex flex-col gap-1">
                          <h2 className="text-3xl font-bold text-white leading-tight">
                            {record.first_name} {" "} {record.last_name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-white/50 uppercase tracking-widest">
                              Time In:
                            </h2>
                            <h2 className="text-xl font-semibold text-cyan-400">
                              {formatTimeIn(record.time_in)}
                            </h2>
                          </div>

                          {record.time_out && (
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-semibold text-white/50 uppercase tracking-widest">
                                Time Out:
                              </h2>
                              <h2 className="text-xl font-semibold text-purple-400">
                                {formatTimeIn(record.time_out)}
                              </h2>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 border-t border-white/20 pt-3">
                          <h2 className="text-xl font-semibold text-white/50 uppercase tracking-widest">Date</h2>
                          <h2 className="text-xl text-white/70 font-medium">
                            {new Date(record.time_in).toLocaleDateString()}
                          </h2>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4 w-full mt-6">

        {/* ANNOUNCEMENT - 10 COLS */}
        <div className="col-span-10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md text-white py-6 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex gap-16">
            <div className="marquee text-xl font-semibold text-white/90">
              {announcements.length > 0
                ? announcements.map((announcement, index) => (
                  <span key={index}>📢 Announcement: {announcement} • </span>
                ))
                : "📢 Announcement: Welcome to the School Attendance System • Please tap your RFID properly • Keep your ID visible at all times • Have a great day!"}
            </div>

            <div className="marquee text-xl font-semibold text-white/90">
              {announcements.length > 0
                ? announcements.map((announcement, index) => (
                  <span key={index}>📢 Announcement: {announcement} • </span>
                ))
                : "📢 Announcement: Welcome to the School Attendance System • Please tap your RFID properly • Keep your ID visible at all times • Have a great day!"}
            </div>
          </div>
        </div>

        {/* DATE & TIME - 2 COLS */}
        <div className="col-span-2 flex items-center justify-center">
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 shadow-xl text-white font-semibold text-center hover:bg-white/15 transition-all">
            <p className="text-sm text-white/70">{currentDate}</p>
            <p className="text-2xl font-bold text-white">{currentTime}</p>
          </div>
        </div>

      </div>

      {/* UNIFIED MODAL */}
      {activeModal === "scanned" && scannedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={closeAllModals}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-green-400/50 p-12 rounded-3xl text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-center w-32 h-32 rounded-full mx-auto relative border-2 border-green-400/50 bg-green-500/10">
                <svg
                  className="w-16 h-16 text-green-400 animate-bounce"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">Success!</h2>
            <h3 className="text-2xl text-white mb-4">
              {scannedStudent.first_name} {scannedStudent.last_name}
            </h3>

            <p className="text-green-400 text-2xl font-bold mb-2">
              {formatTimeIn(scannedStudent.time_in)}
            </p>

            <p className="text-white font-semibold text-lg mb-2">Attendance Recorded</p>

            {/* 5 MINUTES APPROACHING MESSAGE */}
            {approachingMessage && (
              <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-400 rounded-xl">
                <p className="text-yellow-300 font-semibold">
                  ⚠ {approachingMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeModal === "wait" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={closeAllModals}>
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-400/50 p-12 rounded-3xl text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-center w-32 h-32 rounded-full mx-auto relative border-2 border-amber-400/50 bg-amber-500/10">
                <svg
                  className="w-16 h-16 text-amber-400 animate-bounce"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Please Wait</h2>
            <p className="text-amber-300 text-xl mb-6 font-semibold">
              {waitMessage}
            </p>
            <div className="flex items-center gap-2 justify-center text-white/70">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse animation-delay-300"></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse animation-delay-600"></div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "error" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={closeAllModals}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-12 rounded-3xl text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-center w-32 h-32 rounded-full mx-auto relative border-2 border-red-400/50 bg-red-500/10">
                <svg
                  className="w-16 h-16 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0-12a9 9 0 110 18 9 9 0 010-18zm0 0a9 9 0 110 18 9 9 0 010-18z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">{errorTitle}</h2>
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="flex items-center gap-2 text-white">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-lg font-semibold">
                  {notRegisteredMessage || "Please contact the administrator"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kiosk;
