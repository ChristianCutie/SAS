import { useEffect, useState } from "react";
import { utils, writeFile } from "xlsx";
import { toast } from "sonner";
import { attendanceService } from "@/services/api";
import api from "@/services/api"; // Import the axios instance directly
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Users,
  UserCheck,
} from "lucide-react";

interface StudentData {
  id: number;
  rfid_tag_number: string | null;
  profile_picture: string | null;
  student_number: string;
  student_status: string;
  is_active: number;
  section_name: string;
  school_year: string;
  semester: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  birthdate: string;
  email: string;
  contact_number: string;
  guardian_contact_number: string;
  created_at: string;
  updated_at: string;
  is_archived: number;
  fingerprint_id: string | null;
}

interface AttendanceRecord {
  id: number;
  rfid_tag_number: string | null;
  student_number: string;
  time_in: string;
  time_out: string | null;
  attendance_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  fingerprint_id: string | null;
  student: StudentData;
  total_hours_rendered?: number; // from backend
}

interface EmployeeAttendanceApi {
  id: number;
  employee_number: string;
  attendance_date: string;
  time_in: string;
  time_out: string | null;
  status: string;
  full_name: string | null;
  profile_picture_url: string | null;
}

interface TransformedRecord {
  id: number;
  student_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  student_number: string;
  section_name: string;
  school_year: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  remarks: string | null;
  profile_picture: string | null;
  total_hours_rendered?: number;
  hours_worked: string; // record-level diff
}

interface AttendanceStats {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
}

const AttendanceList = () => {
  const [activeTab, setActiveTab] = useState<"students" | "employees">(
    "students",
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    TransformedRecord[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Student filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "present" | "absent" | "late" | "excused"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Employee filters & data
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeFilterStatus, setEmployeeFilterStatus] = useState<
    "all" | "present" | "absent" | "late" | "excused"
  >("all");
  const [employeeStartDate, setEmployeeStartDate] = useState("");
  const [employeeEndDate, setEmployeeEndDate] = useState("");
  const [employeeData, setEmployeeData] = useState<EmployeeAttendanceApi[]>([]);
  const [employeeTotalHours, setEmployeeTotalHours] = useState<number>(0);

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [stats, setStats] = useState<AttendanceStats>({
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    excused_count: 0,
  });
  const [employeeStats, setEmployeeStats] = useState<AttendanceStats>({
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    excused_count: 0,
  });

  // Are any employee filters active?
  const isEmployeeFiltered =
    employeeSearchTerm !== "" ||
    employeeFilterStatus !== "all" ||
    employeeStartDate !== "" ||
    employeeEndDate !== "";

  // Are any student filters active?
  const isStudentFiltered =
    searchTerm !== "" ||
    filterStatus !== "all" ||
    startDate !== "" ||
    endDate !== "";

const parseHoursWorked = (hoursStr: string): number => {
  if (hoursStr === "-") return 0;
  const match = hoursStr.match(/(\d+)h\s+(\d+)m/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours + minutes / 60;
};

  // Student total hours from current page (record‑level)
  const studentTotalHours = attendanceRecords.reduce((sum, record) => {
    sum += parseHoursWorked(record.hours_worked);
    return sum;
  }, 0);

  // Helper: calculate worked hours from two timestamps
  const calculateWorkedHours = (
    timeIn: string,
    timeOut: string | null,
  ): string => {
    if (!timeIn || !timeOut) return "-";
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "0h 0m";
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, startDate, endDate]);

  useEffect(() => {
    loadAttendanceRecords();
  }, [currentPage, perPage, searchTerm, filterStatus, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "employees") {
      loadEmployeeAttendance();
    }
  }, [
    activeTab,
    employeeSearchTerm,
    employeeFilterStatus,
    employeeStartDate,
    employeeEndDate,
  ]);

  // Transform data from backend to our local shape
  const transformAttendanceData = (
    apiData: AttendanceRecord[],
  ): TransformedRecord[] => {
    return apiData.map((record) => ({
      id: record.id,
      student_id: record.student.id,
      first_name: record.student.first_name,
      middle_name: record.student.middle_name,
      last_name: record.student.last_name,
      student_number: record.student.student_number,
      section_name: record.student.section_name,
      school_year: record.student.school_year,
      attendance_date: record.attendance_date,
      check_in_time: record.time_in,
      check_out_time: record.time_out,
      status: record.status,
      remarks: null,
      profile_picture: record.student.profile_picture,
      total_hours_rendered: record.total_hours_rendered ?? 0,
      hours_worked: calculateWorkedHours(record.time_in, record.time_out),
    }));
  };

  // ---------- STUDENT ATTENDANCE LOADING (now includes summary stats) ----------
  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        per_page: perPage,
      };
      if (searchTerm) params.student_number = searchTerm;
      if (filterStatus !== "all") params.status = filterStatus;
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;

      // Fetch the paginated records (for the table)
      const response = await attendanceService.getAttendances(params);
      if (response.data && Array.isArray(response.data)) {
        const transformed = transformAttendanceData(response.data);
        setAttendanceRecords(transformed);

        if (response.pagination) {
          setTotalRecords(response.pagination.total);
          setLastPage(response.pagination.last_page);
          setCurrentPage(response.pagination.current_page);
          setPerPage(response.pagination.per_page);
        }
      } else {
        setAttendanceRecords([]);
      }

      // Fetch accurate summary from dedicated endpoint
      const summaryParams: any = {};
      if (searchTerm) summaryParams.student_number = searchTerm;
      if (filterStatus !== "all") summaryParams.status = filterStatus;
      if (startDate) summaryParams.date_from = startDate;
      if (endDate) summaryParams.date_to = endDate;

      const summaryResponse = await attendanceService.getAttendanceSummary(summaryParams);
      const summaryData = summaryResponse.data; // { total_records, present, timed_out }

      // Set stats: absent = total - present (simple approximation; no late/excused from this endpoint)
      setStats({
        total_records: summaryData.total_records ?? 0,
        present_count: summaryData.present ?? 0,
        absent_count: (summaryData.total_records ?? 0) - (summaryData.present ?? 0),
        late_count: 0,
        excused_count: 0,
      });
    } catch (error) {
      console.error("Failed to load attendance records:", error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- EMPLOYEE ATTENDANCE LOADING (enhanced with summary) ----------
  const loadEmployeeAttendance = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (employeeSearchTerm) params.search = employeeSearchTerm;
      if (employeeFilterStatus !== "all") params.status = employeeFilterStatus;
      if (employeeStartDate) params.start_date = employeeStartDate;
      if (employeeEndDate) params.end_date = employeeEndDate;

      // Fetch the actual records (for the table)
      const response = await api.get("/employee/attendance", { params });
      const data = response.data;

      if (data.isSuccess) {
        const mapped: EmployeeAttendanceApi[] = data.data.map(
          (item: any) => ({
            id: item.id,
            employee_number: item.employee_number,
            attendance_date: item.attendance_date,
            time_in: item.time_in,
            time_out: item.time_out,
            status: item.status,
            full_name: item.full_name ?? null,
            profile_picture_url: item.profile_picture_url ?? null,
          }),
        );
        setEmployeeData(mapped);

        if (data.summary) {
          setEmployeeTotalHours(data.summary.total_hours_worked);
        }
      }

      // Fetch summary for total/present/absent
      const summaryParams: any = {};
      if (employeeSearchTerm) summaryParams.employee_number = employeeSearchTerm;
      if (employeeFilterStatus !== "all") summaryParams.status = employeeFilterStatus;
      if (employeeStartDate) summaryParams.date_from = employeeStartDate;
      if (employeeEndDate) summaryParams.date_to = employeeEndDate;

      const summaryRes = await api.get("/employee/attendance/summary", { params: summaryParams });
      const sumData = summaryRes.data.data; // structure: { total_records, present, timed_out }

      // Calculate late/excused locally (since the summary endpoint doesn't provide them)
      const lateCount = (data?.data ?? []).filter(
        (r: any) => r.status?.toLowerCase() === "late"
      ).length;
      const excusedCount = (data?.data ?? []).filter(
        (r: any) => r.status?.toLowerCase() === "excused"
      ).length;

      setEmployeeStats({
        total_records: sumData.total_records ?? 0,
        present_count: sumData.present ?? 0,
        absent_count: (sumData.total_records ?? 0) - (sumData.present ?? 0),
        late_count: lateCount,
        excused_count: excusedCount,
      });
    } catch (error) {
      console.error("Failed to load employee attendance:", error);
      setEmployeeData([]);
      setEmployeeTotalHours(0);
    } finally {
      setLoading(false);
    }
  };

  // ---------- EXPORT TO EXCEL (unchanged) ----------
  const exportToExcel = () => {
    let dataToExport: any[] = [];

    if (activeTab === "students") {
      if (attendanceRecords.length === 0) {
        toast.error("No records to export");
        return;
      }
      dataToExport = attendanceRecords.map((record) => ({
        "Student Number": record.student_number,
        "Student Name": `${record.last_name}, ${record.first_name}`,
        Date: new Date(record.attendance_date).toLocaleDateString(),
        "Check-in Time": formatTimeIn(record.check_in_time) || "-",
        "Check-out Time": formatTimeIn(record.check_out_time) || "-",
        "Hours Worked": record.hours_worked,
        Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      }));
    } else {
      if (employeeData.length === 0) {
        toast.error("No records to export");
        return;
      }
      dataToExport = employeeData.map((record) => ({
        "Employee Number": record.employee_number,
        "Employee Name": record.full_name || "-",
        Date: new Date(record.attendance_date).toLocaleDateString(),
        "Check-in Time": formatTimeIn(record.time_in) || "-",
        "Check-out Time": formatTimeIn(record.time_out) || "-",
        "Hours Worked": calculateWorkedHours(record.time_in, record.time_out),
        Status:
          record.status?.charAt(0).toUpperCase() + (record.status?.slice(1) || "") || "-",
      }));
    }

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Attendance Records");

    const columnWidths =
      activeTab === "students"
        ? [
            { wch: 15 }, // Student Number
            { wch: 20 }, // Student Name
            { wch: 12 }, // Date
            { wch: 15 }, // Check-in
            { wch: 15 }, // Check-out
            { wch: 12 }, // Hours Worked
            { wch: 12 }, // Status
          ]
        : [
            { wch: 15 }, // Employee Number
            { wch: 20 }, // Employee Name
            { wch: 12 }, // Date
            { wch: 15 }, // Check-in
            { wch: 15 }, // Check-out
            { wch: 12 }, // Hours Worked
            { wch: 12 }, // Status
          ];
    worksheet["!cols"] = columnWidths;

    const timestamp = new Date().toISOString().split("T")[0];
    const filePrefix =
      activeTab === "students" ? "Student_Attendance" : "Employee_Attendance";
    const filename = `${filePrefix}_${timestamp}.xlsx`;

    writeFile(workbook, filename);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (activeTab === "students") {
        await loadAttendanceRecords();
      } else {
        await loadEmployeeAttendance();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- STATUS BADGES (unchanged) ----------
  const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "timed in" || normalized === "present") {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Present
        </Badge>
      );
    }
    if (normalized === "timed out") {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Timed Out
        </Badge>
      );
    }
    switch (normalized) {
      case "absent":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Absent
          </Badge>
        );
      case "late":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Late
          </Badge>
        );
      case "excused":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Excused
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimeIn = (time: string | null) => {
    if (!time) return "-";
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getImageUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `https://api-sas.slarenasitsolutions.com/public/${path}`;
  };

  // ---------- UI RENDERING (unchanged, but includes the stat cards that now use the updated stats) ----------
  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-600">
            {activeTab === "students"
              ? `Showing ${attendanceRecords.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to ${Math.min(currentPage * perPage, totalRecords)} of ${totalRecords} records`
              : `Showing ${employeeData.length} employee records`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-slate-200">
        <Button
          variant={"outline"}
          onClick={() => {
            setActiveTab("students");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 font-medium transition-all flex items-center gap-2 bg-white border ${
            activeTab === "students"
              ? "text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-gray-100"
          }`}
        >
          <Users className="h-4 w-4" />
          Student Attendance
        </Button>

        <Button
          variant={"outline"}
          onClick={() => {
            setActiveTab("employees");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 font-medium transition-all flex items-center gap-2 bg-white ${
            activeTab === "employees"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-gray-100"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Employee Attendance
        </Button>
      </div>

      {/* Stats Summary - Students (now using the accurate stats from summary endpoint) */}
      {activeTab === "students" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Total Records
                  </p>
                  <p className="text-2xl font-bold text-slate-700 mt-2">
                    {stats.total_records}
                  </p>
                </div>
                <Calendar className="h-10 w-10 text-slate-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    Present
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-2">
                    {stats.present_count}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-900">Absent</p>
                  <p className="text-2xl font-bold text-red-700 mt-2">
                    {stats.absent_count}
                  </p>
                </div>
                <XCircle className="h-10 w-10 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Summary - Employees (now using the accurate stats) */}
      {activeTab === "employees" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Total Records
                  </p>
                  <p className="text-2xl font-bold text-slate-700 mt-2">
                    {employeeStats.total_records}
                  </p>
                </div>
                <Calendar className="h-10 w-10 text-slate-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    Present
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-2">
                    {employeeStats.present_count}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-900">Absent</p>
                  <p className="text-2xl font-bold text-red-700 mt-2">
                    {employeeStats.absent_count}
                  </p>
                </div>
                <XCircle className="h-10 w-10 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar - Students (unchanged) */}
      {activeTab === "students" && (
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by student number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                   <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                      setStartDate("");
                      setEndDate("");
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportToExcel}
                    disabled={attendanceRecords.length === 0}
                    title="Export current page records to Excel"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {isStudentFiltered && (
                <div className="flex flex-wrap gap-2 items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <span className="text-sm text-blue-900 font-medium">
                    Active Filters:
                  </span>
                  {searchTerm && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Student: {searchTerm}
                    </span>
                  )}
                  {filterStatus !== "all" && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Status: {filterStatus}
                    </span>
                  )}
                  {startDate && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      From: {new Date(startDate).toLocaleDateString()}
                    </span>
                  )}
                  {endDate && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      To: {new Date(endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Bar - Employees (unchanged) */}
      {activeTab === "employees" && (
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by employee number or name..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEmployeeSearchTerm("");
                      setEmployeeFilterStatus("all");
                      setEmployeeStartDate("");
                      setEmployeeEndDate("");
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportToExcel}
                    disabled={employeeData.length === 0}
                    title="Export filtered records to Excel"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Status
                  </label>
                  <select
                    value={employeeFilterStatus}
                    onChange={(e) =>
                      setEmployeeFilterStatus(e.target.value as any)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={employeeStartDate}
                    onChange={(e) => setEmployeeStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={employeeEndDate}
                    onChange={(e) => setEmployeeEndDate(e.target.value)}
                  />
                </div>
              </div>

              {isEmployeeFiltered && (
                <div className="flex flex-wrap gap-2 items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <span className="text-sm text-blue-900 font-medium">
                    Active Filters:
                  </span>
                  {employeeSearchTerm && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Employee: {employeeSearchTerm}
                    </span>
                  )}
                  {employeeFilterStatus !== "all" && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Status: {employeeFilterStatus}
                    </span>
                  )}
                  {employeeStartDate && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      From: {new Date(employeeStartDate).toLocaleDateString()}
                    </span>
                  )}
                  {employeeEndDate && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      To: {new Date(employeeEndDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Attendance Table (unchanged) */}
      {activeTab === "students" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Student Attendance Records</CardTitle>
            {/* Total Hours badge – only when filters are active */}
            {isStudentFiltered && (
              <div className="text-sm font-medium text-slate-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                Total Hours (page):{" "}
                <span className="font-bold text-blue-700">
                  {(() => {
                    const hours = Math.floor(studentTotalHours);
                    const minutes = Math.round((studentTotalHours - hours) * 60);
                    return `${hours}h ${minutes}m`;
                  })()}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">
                  Loading attendance records...
                </p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">
                  No records found
                </h3>
                <p className="text-slate-500 mt-1">
                  {isStudentFiltered
                    ? "Try adjusting your filters"
                    : "No attendance records available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700">
                        Student Info
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Check-in
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Check-out
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Hours Worked
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow
                        key={record.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                              {record.profile_picture ? (
                                <img
                                  src={getImageUrl(record.profile_picture)}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <User className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {record.last_name}, {record.first_name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {record.student_number}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">
                            {new Date(
                              record.attendance_date,
                            ).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {formatTimeIn(record.check_in_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {formatTimeIn(record.check_out_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {record.hours_worked}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {attendanceRecords.length > 0 && (
            <div className="border-t border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">
                  Items per page:
                </label>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {lastPage}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading}
                  className="text-slate-600"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="text-slate-600"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === lastPage || loading}
                  className="text-slate-600"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(lastPage)}
                  disabled={currentPage === lastPage || loading}
                  className="text-slate-600"
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Employee Attendance Table (unchanged) */}
      {activeTab === "employees" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Employee Attendance</CardTitle>
            {isEmployeeFiltered && (
              <div className="text-sm font-medium text-slate-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                Total Hours Worked:{" "}
                <span className="font-bold text-blue-700">
                  {employeeTotalHours.toFixed(2)}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">
                  Loading attendance records...
                </p>
              </div>
            ) : employeeData.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">
                  No records found
                </h3>
                <p className="text-slate-500 mt-1">
                  {isEmployeeFiltered
                    ? "Try adjusting your filters"
                    : "No employee attendance records available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700">
                        Employee Info
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Check-in
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Check-out
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Hours Worked
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeData.map((record) => (
                      <TableRow
                        key={record.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                              {record.profile_picture_url ? (
                                <img
                                  src={getImageUrl(record.profile_picture_url)}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <User className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {record.full_name || record.employee_number}
                              </div>
                              <div className="text-sm text-slate-500">
                                {record.employee_number}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">
                            {new Date(
                              record.attendance_date,
                            ).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {formatTimeIn(record.time_in)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {formatTimeIn(record.time_out)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {calculateWorkedHours(
                              record.time_in,
                              record.time_out,
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceList;