import axios from 'axios';

// API base configuration
const API_BASE_URL = 'https://api-sas.slarenasitsolutions.com/public/api';

// Create axios instance WITH connection pooling and timeout
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 10000, // 10 second timeout to release connections faster
});

// Request interceptor for adding auth token and optimize headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add cache headers for GET requests to leverage browser cache
        if (config.method === 'get') {
            config.headers['Cache-Control'] = 'max-age=5'; // 5 second browser cache
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Authentication Service
export const authService = {
    // Login
    login: async (email: string, password: string) => {
        try {
            const response = await api.post('/login', { email, password });
            if (response.data.token) {
                localStorage.setItem('auth_token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Logout
    logout: async () => {
        try {
            const response = await api.post('/logout');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Change Password
    changePassword: async (currentPassword: string, newPassword: string) => {
        try {
            const response = await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPassword
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Get current user from localStorage
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('auth_token');
    }
};

// Students Service - UPDATED WITH REQUEST DEDUPLICATION
export const studentService = {
    // Cache for pending requests to prevent duplicate API calls
    _getAllStudentsPending: null as Promise<any> | null,
    _getStudentStatsPending: null as Promise<any> | null,
    
    // Get all students with optional archive status filter - WITH DEDUPLICATION
    getAllStudents: async (showArchived?: boolean) => {
        try {
            // If pending request exists with same parameters, return it
            if (studentService._getAllStudentsPending) {
                return studentService._getAllStudentsPending;
            }

            const params = showArchived ? { archive_status: 'archived' } : { archive_status: 'active' };
            studentService._getAllStudentsPending = api.get('/students', { params });
            
            const response = await studentService._getAllStudentsPending;
            return response.data;
        } catch (error) {
            console.error('Error fetching students:', error);
            throw error;
        } finally {
            studentService._getAllStudentsPending = null;
        }
    },

    // Get active students only (non-archived)
    getActiveStudents: async () => {
        try {
            const response = await api.get('/students/active');
            return response.data;
        } catch (error) {
            console.error('Error fetching active students:', error);
            throw error;
        }
    },

    // Get archived students only
    getArchivedStudents: async () => {
        try {
            const response = await api.get('/students/archived');
            return response.data;
        } catch (error) {
            console.error('Error fetching archived students:', error);
            throw error;
        }
    },

    // Get student by ID (including archived)
    getStudentById: async (id: number) => {
        try {
            const response = await api.get(`/students/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching student ${id}:`, error);
            throw error;
        }
    },

    // Create new student
    createStudent: async (studentData: any) => {
        try {
            const config: any = {};
            
            // For FormData, let axios handle the Content-Type and boundary
            if (studentData instanceof FormData) {
                config.headers = {
                    'Content-Type': undefined,
                };
            }
            
            const response = await api.post('/create/students', studentData, config);
            return response.data;
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    },

    // Update student
    updateStudent: async (id: number, studentData: any) => {
        try {
            const config: any = {};
            
            // For FormData, let axios handle the Content-Type and boundary
            if (studentData instanceof FormData) {
                config.headers = {
                    'Content-Type': undefined,
                };
            }
            
            const response = await api.post(`/update/students/${id}`, studentData, config);
            return response.data;
        } catch (error) {
            console.error(`Error updating student ${id}:`, error);
            throw error;
        }
    },

    // Archive student (soft delete)
    archiveStudent: async (id: number) => {
        try {
            const response = await api.post(`/archive/students/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error archiving student ${id}:`, error);
            throw error;
        }
    },

    // Restore archived student
    restoreStudent: async (id: number) => {
        try {
            const response = await api.post(`/students/${id}/restore`);
            return response.data;
        } catch (error) {
            console.error(`Error restoring student ${id}:`, error);
            throw error;
        }
    },

    // Delete student permanently (only for archived students)
    deleteStudent: async (id: number) => {
        try {
            const response = await api.delete(`/students/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting student ${id}:`, error);
            throw error;
        }
    },

    // Get student statistics - WITH DEDUPLICATION
    getStudentStats: async () => {
        try {
            // Reuse pending request if one exists
            if (studentService._getStudentStatsPending) {
                return studentService._getStudentStatsPending;
            }

            studentService._getStudentStatsPending = api.get('/students/stats');
            
            const response = await studentService._getStudentStatsPending;
            return response.data;
        } catch (error) {
            console.error('Error fetching student stats:', error);
            // Return fallback stats for development
            return {
                total_students: 342,
                active_students: 320,
                archived_students: 22,
                students_with_rfid: 298,
                regular_students: 280
            };
        } finally {
            studentService._getStudentStatsPending = null;
        }
    },

    // Search students
    searchStudents: async (query: string) => {
        try {
            const response = await api.get(`/students/search?q=${query}`);
            return response.data;
        } catch (error) {
            console.error('Error searching students:', error);
            throw error;
        }
    }
};

// Attendance Service
export const attendanceService = {
    // Cache for pending attendance requests
    _getTodayAttendancePending: null as Promise<any> | null,

    // Time In student
    timeIn: async (rfidTagNumber: string) => {
        try {
            const response = await api.post('/attendance/time-in', {
                rfid_tag_number: rfidTagNumber
            });
            return response.data;
        } catch (error) {
            console.error('Error during time in:', error);
            throw error;
        }
    },

    // Time Out student
    timeOut: async (rfidTagNumber: string) => {
        try {
            const response = await api.post('/attendance/time-out', {
                rfid_tag_number: rfidTagNumber
            });
            return response.data;
        } catch (error) {
            console.error('Error during time out:', error);
            throw error;
        }
    },

    // Combined scan endpoint (if you add it to backend)
    scanAttendance: async (rfidTagNumber: string) => {
        try {
            const response = await api.post('/attendance/scan', {
                rfid_tag_number: rfidTagNumber
            });
            return response.data;
        } catch (error) {
            console.error('Error during scan:', error);
            throw error;
        }
    },

    // Get attendance by RFID
    getAttendanceByRfid: async (rfidTagNumber: string) => {
        try {
            const response = await api.get(`/attendance/${rfidTagNumber}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching attendance:', error);
            throw error;
        }
    },

    // Get today's attendance - WITH REQUEST DEDUPLICATION to prevent connection exhaustion
    getTodayAttendance: async () => {
        try {
            // If a request is already pending, return that instead of making a new one
            if (attendanceService._getTodayAttendancePending) {
                return attendanceService._getTodayAttendancePending;
            }

            // Create new request
            attendanceService._getTodayAttendancePending = api.get('/attendance/today');
            
            const response = await attendanceService._getTodayAttendancePending;
            return response.data;
        } catch (error) {
            console.error('Error fetching today\'s attendance:', error);
            throw error;
        } finally {
            // Clear pending request
            attendanceService._getTodayAttendancePending = null;
        }
    },

    // Get attendance summary (if you add this endpoint)
    getAttendanceSummary: async (startDate?: string, endDate?: string) => {
        try {
            let url = '/attendance/summary';
            if (startDate && endDate) {
                url += `?start_date=${startDate}&end_date=${endDate}`;
            }
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching attendance summary:', error);
            throw error;
        }
    },

    // Get recent attendance records (latest 4)
    getRecentAttendance: async () => {
        try {
            const response = await api.get('/attendance/recent');
            return response.data;
        } catch (error) {
            console.error('Error fetching recent attendance:', error);
            throw error;
        }
    },

    // Get all attendance records
    getAttendances: async () => {
        try {
            const response = await api.get('/attendance');
            return response.data;
        } catch (error) {
            console.error('Error fetching all attendance records:', error);
            throw error;
        }
    }
};

// Dashboard Service
export const dashboardService = {
    // Get dashboard stats
    getStats: async () => {
        try {
            const response = await api.get('/dashboard/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Return mock data for development
            return {
                total_students: 342,
                active_students: 320,
                total_scans_today: 142,
                present_today: 289,
                absent_today: 53,
                system_uptime: '99.8%'
            };
        }
    },

    // Get recent activity
    getRecentActivity: async (limit = 10) => {
        try {
            const response = await api.get(`/dashboard/recent-activity?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            throw error;
        }
    }
};

// Fingerprint Service
export const fingerprintService = {
    // Get all student fingerprint templates
    getStudentTemplates: async () => {
        try {
            const response = await api.get('/student-templates');
            return response.data;
        } catch (error) {
            console.error('Error fetching fingerprint templates:', error);
            throw error;
        }
    },

    // // Verify a fingerprint sample against stored templates
    // verifyFingerprint: async (fingerprintSample: any, studentTemplates: Array<{student_number: string; fingerprint_template: string}>) => {
    //     try {
    //         const response = await api.post('/verify-fingerprint', {
    //             fingerprint_sample: fingerprintSample,
    //             student_templates: studentTemplates
    //         });
    //         return response.data;
    //     } catch (error) {
    //         console.error('Error verifying fingerprint:', error);
    //         throw error;
    //     }
    // },

    // Save fingerprint template for a student
    // saveTemplate: async (studentId: number, fingerprintTemplate: any) => {
    //     try {
    //         const response = await api.post('/set-fingerprint', {
    //             student_id: studentId,
    //             fingerprint_template: fingerprintTemplate
    //         });
    //         return response.data;
    //     } catch (error) {
    //         console.error('Error saving fingerprint template:', error);
    //         throw error;
    //     }
    // }
};

// Announcement Service
export const announcementService = {
    // Get all announcements
    getAnnouncements: async () => {
        try {
            const response = await api.get('/announcements');
            return response.data;
        } catch (error) {
            console.error('Error fetching announcements:', error);
            throw error;
        }
    }
};

// Export types that match your Laravel models
export interface Student {
    id: number;
    rfid_tag_number: string;
    student_number: string;
    profile_picture?: string | null;
    student_status: string;
    is_active: boolean;
    course_name: string;
    section_name: string;
    school_year: string;
    semester: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    gender: string;
    birthdate: string;
    email: string;
    contact_number: string;
    guardian_contact_number: string;
    is_archived: boolean;
    created_at?: string;
    updated_at?: string;
    fingerprint_id?: string | null;
}

export interface AttendanceRecord {
    id: number;
    rfid_tag_number: string;
    student_number: string;
    attendance_date: string;
    time_in: string;
    time_out: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
}

export interface LoginResponse {
    message: string;
    user: User;
    token: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
}

export interface StudentStats {
    total_students: number;
    active_students: number;
    archived_students: number;
    students_with_rfid: number;
    regular_students: number;
}

export interface FingerprintTemplate {
    student_id: number;
    student_number: string;
    fingerprint_template: string;
}

export interface VerificationResponse {
    message: string;
    matched_student?: {
        student_id: number;
        student_number: string;
        fingerprint_template: string;
        first_name?: string;
        last_name?: string;
    };
}

export default api;