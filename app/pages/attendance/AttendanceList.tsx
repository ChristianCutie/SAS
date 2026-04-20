import { useEffect, useState } from "react";
import { utils, writeFile } from "xlsx";
import { toast } from "sonner";
import { attendanceService } from "@/services/api";
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
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
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
  status: "present" | "absent" | "late" | "excused";
  created_at: string;
  updated_at: string;
  fingerprint_id: string | null;
  student: StudentData;
}

interface RecentEmployeeAttendance {
  type: "employee";
  id: number;
  employee_number: string;
  attendance_date: string;
  time_in: string;
  time_out: string | null;
  status: string;
  created_at: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_picture: string | null;
    department: string;
    position: string;
  } | null;
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
  status: "present" | "absent" | "late" | "excused";
  remarks: string | null;
  profile_picture: string | null;
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
  //const [recentStudentAttendance, setRecentStudentAttendance] = useState<RecentStudentAttendance[]>([]);
  const [recentEmployeeAttendance, setRecentEmployeeAttendance] = useState<
    RecentEmployeeAttendance[]
  >([]);
  const [filteredEmployeeAttendance, setFilteredEmployeeAttendance] = useState<
    RecentEmployeeAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Student filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "present" | "absent" | "late" | "excused"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Employee filters
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeFilterStatus, setEmployeeFilterStatus] = useState<
    "all" | "present" | "absent" | "late" | "excused"
  >("all");
  const [employeeStartDate, setEmployeeStartDate] = useState("");
  const [employeeEndDate, setEmployeeEndDate] = useState("");

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, startDate, endDate]);

  useEffect(() => {
    loadAttendanceRecords();
    loadRecentAttendance();
  }, [currentPage, perPage, searchTerm, filterStatus, startDate, endDate]);

  useEffect(() => {
    filterEmployeeAttendance();
  }, [
    recentEmployeeAttendance,
    employeeSearchTerm,
    employeeFilterStatus,
    employeeStartDate,
    employeeEndDate,
  ]);

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
    }));
  };

  const filterEmployeeAttendance = () => {
    let filtered = [...recentEmployeeAttendance];

    // Filter by search term (employee number or name)
    if (employeeSearchTerm) {
      const searchLower = employeeSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.employee_number.toLowerCase().includes(searchLower) ||
          record.employee?.first_name.toLowerCase().includes(searchLower) ||
          record.employee?.last_name.toLowerCase().includes(searchLower),
      );
    }

    // Filter by status
    if (employeeFilterStatus !== "all") {
      filtered = filtered.filter(
        (record) => record.status.toLowerCase() === employeeFilterStatus,
      );
    }

    // Filter by date range
    if (employeeStartDate) {
      filtered = filtered.filter(
        (record) =>
          new Date(record.attendance_date) >= new Date(employeeStartDate),
      );
    }
    if (employeeEndDate) {
      filtered = filtered.filter(
        (record) =>
          new Date(record.attendance_date) <= new Date(employeeEndDate),
      );
    }

    setFilteredEmployeeAttendance(filtered);
    calculateEmployeeStats(filtered);
  };

  const calculateEmployeeStats = (records: RecentEmployeeAttendance[]) => {
    const stats: AttendanceStats = {
      total_records: records.length,
      present_count: records.filter((r) => r.status.toLowerCase() === "present")
        .length,
      absent_count: records.filter((r) => r.status.toLowerCase() === "absent")
        .length,
      late_count: records.filter((r) => r.status.toLowerCase() === "late")
        .length,
      excused_count: records.filter((r) => r.status.toLowerCase() === "excused")
        .length,
    };
    setEmployeeStats(stats);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (activeTab === "students") {
        await loadAttendanceRecords();
      } else {
        await loadRecentAttendance();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAttendance = async () => {
    try {
      const response = await attendanceService.getRecentAttendanceSeparated();

      if (response && response.employees) {
        setRecentEmployeeAttendance(response.employees);
      }
    } catch (error) {
      console.error("Failed to load recent attendance:", error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      // Fetch attendance records with pagination and filters from backend API
      const params = {
        page: currentPage,
        per_page: perPage,
        ...(searchTerm && { student_number: searchTerm }),
        ...(filterStatus !== "all" && { status: filterStatus }),
        ...(startDate && { date_from: startDate }),
        ...(endDate && { date_to: endDate }),
      };

      const response = await attendanceService.getAttendances(params);
      const transformedData = transformAttendanceData(response.data);
      setAttendanceRecords(transformedData);

      // Update pagination info from response
      if (response.pagination) {
        setTotalRecords(response.pagination.total);
        setLastPage(response.pagination.last_page);
        setCurrentPage(response.pagination.current_page);
        setPerPage(response.pagination.per_page);
      }

      // Update stats with total count
      setStats({
        total_records: response.pagination?.total || 0,
        present_count: 0,
        absent_count: 0,
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

  // const handleDelete = async (id: number) => {
  //     if (window.confirm('Are you sure you want to delete this attendance record?')) {
  //         try {
  //             await attendanceService.deleteAttendance(id);
  //             alert('Record deleted successfully');
  //             loadAttendanceRecords();
  //             loadStats();
  //         } catch (error) {
  //             alert('Failed to delete record');
  //             console.error('Delete error:', error);
  //         }
  //     }
  // };

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
        "Check-in Time": record.check_in_time || "-",
        "Check-out Time": record.check_out_time || "-",
        Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
        Remarks: record.remarks || "-",
      }));
    } else {
      if (recentEmployeeAttendance.length === 0) {
        toast.error("No records to export");
        return;
      }
      dataToExport = recentEmployeeAttendance.map((record) => ({
        "Employee Number": record.employee_number,
        Date: new Date(record.attendance_date).toLocaleDateString(),
        "Check-in Time": record.time_in || "-",
        "Check-out Time": record.time_out || "-",
        Status:
          record.status?.charAt(0).toUpperCase() +
            (record.status?.slice(1) || "") || "-",
      }));
    }

    // Create workbook and worksheet
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Attendance Records");

    // Set column widths
    const columnWidths =
      activeTab === "students"
        ? [
            { wch: 15 }, // Student Number
            { wch: 20 }, // Student Name
            { wch: 12 }, // Date
            { wch: 15 }, // Check-in Time
            { wch: 15 }, // Check-out Time
            { wch: 12 }, // Status
            { wch: 20 }, // Remarks
          ]
        : [
            { wch: 15 }, // Employee Number
            { wch: 12 }, // Date
            { wch: 15 }, // Check-in Time
            { wch: 15 }, // Check-out Time
            { wch: 12 }, // Status
          ];
    worksheet["!cols"] = columnWidths;

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filePrefix =
      activeTab === "students" ? "Student_Attendance" : "Employee_Attendance";
    const filename = `${filePrefix}_${timestamp}.xlsx`;

    writeFile(workbook, filename);
  };

  // Filter records based on search term, status, and date range
  const filteredRecords = attendanceRecords;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Present
          </Badge>
        );
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getImageUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `https://api-sas.slarenasitsolutions.com/public/${path}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-600">
            {activeTab === "students"
              ? `Showing ${attendanceRecords.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to ${Math.min(currentPage * perPage, totalRecords)} of ${totalRecords} records`
              : `Showing ${recentEmployeeAttendance.length} recent employee records`}
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
      <div className="flex gap-2  border-slate-200">
        <Button
        variant={"outline"}
          onClick={() => {
            setActiveTab("students");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 font-medium  transition-all flex items-center gap-2 bg-white border ${
            activeTab === "students"
              ? " text-blue-600"
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

      {/* Stats Summary - Only for Students */}
      {activeTab === "students" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
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

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900">Late</p>
                  <p className="text-2xl font-bold text-amber-700 mt-2">
                    {stats.late_count}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Excused</p>
                  <p className="text-2xl font-bold text-blue-700 mt-2">
                    {stats.excused_count}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Summary - For Employees */}
      {activeTab === "employees" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
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

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900">Late</p>
                  <p className="text-2xl font-bold text-amber-700 mt-2">
                    {employeeStats.late_count}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Excused</p>
                  <p className="text-2xl font-bold text-blue-700 mt-2">
                    {employeeStats.excused_count}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar - Only for Students */}
      {activeTab === "students" && (
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by student number or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
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

              {/* Status and Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
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
                </div>
              </div>

              {/* Active Filters Info */}
              {(searchTerm ||
                filterStatus !== "all" ||
                startDate ||
                endDate) && (
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

      {/* Search and Filter Bar - For Employees */}
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
                  <Button variant="outline" className="flex-1">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportToExcel}
                    disabled={filteredEmployeeAttendance.length === 0}
                    title="Export filtered records to Excel"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status and Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEmployeeSearchTerm("");
                      setEmployeeFilterStatus("all");
                      setEmployeeStartDate("");
                      setEmployeeEndDate("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Active Filters Info */}
              {(employeeSearchTerm ||
                employeeFilterStatus !== "all" ||
                employeeStartDate ||
                employeeEndDate) && (
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

      {/* Student Attendance Table */}
      {activeTab === "students" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Student Attendance Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">
                  Loading attendance records...
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">
                  No records found
                </h3>
                <p className="text-slate-500 mt-1">
                  {searchTerm || filterStatus !== "all" || startDate || endDate
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
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
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
                            {record.check_in_time || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-slate-700">
                            {record.check_out_time || "-"}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 border-slate-200"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              title="Edit record"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              title="Delete record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* Pagination Controls */}
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

      {/* Employee Attendance Table */}
      {activeTab === "employees" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Recent Employee Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">
                  Loading attendance records...
                </p>
              </div>
            ) : filteredEmployeeAttendance.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">
                  No records found
                </h3>
                <p className="text-slate-500 mt-1">
                  {employeeSearchTerm ||
                  employeeFilterStatus !== "all" ||
                  employeeStartDate ||
                  employeeEndDate
                    ? "Try adjusting your filters"
                    : "No recent employee attendance records available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700">
                        Employee Number
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
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployeeAttendance.map((record) => (
                      <TableRow
                        key={record.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {record.employee_number}
                          </div>
                          {record.employee && (
                            <div className="text-sm text-slate-500">
                              {record.employee.first_name}{" "}
                              {record.employee.last_name}
                            </div>
                          )}
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
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 border-slate-200"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              title="Edit record"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              title="Delete record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
