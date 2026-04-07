export interface Student {
    id: number;
    rfid_tag_number: string;
    student_number: string;
    first_name: string;
    last_name: string;
    course_name: string;
    section_name: string;
    student_status: 'Regular' | 'Irregular';
    is_active: boolean;
    email?: string;
    contact_number?: string;
    fingerprint_id?: string | null;
}

export interface AttendanceRecord {
    id: number;
    student: Student; // Joined from backend
    time_in: string;
    time_out?: string;
    attendance_date: string;
    status: 'present' | 'late' | 'absent';
}

export interface ScanResponse {
    success: boolean;
    message: string;
    type: 'in' | 'out';
    student?: Student;
    time: string;
}