import { useEffect, useState } from "react";
import { utils, writeFile } from "xlsx";
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
  Plus,
  User,
  Edit,
  Archive,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  Trash2,
  Undo,
} from "lucide-react";
import { studentService } from "@/services/api";
import type { Student } from "@/services/api";
import StudentForm from "./StudentForm"; // We'll create this component

const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState({
    total_students: 0,
    active_students: 0,
    archived_students: 0,
    students_with_rfid: 0,
    regular_students: 0,
  });

  useEffect(() => {
    loadStudents();
    // loadStats();
  }, [showArchived]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents(showArchived);
      // Ensure data is always an array - handle API response format
      if (Array.isArray(data)) {
        setStudents(data);
      } else if (data?.students && Array.isArray(data.students)) {
        setStudents(data.students);
      } else if (data?.data && Array.isArray(data.data)) {
        setStudents(data.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await studentService.getStudentStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleArchive = async (id: number, studentName: string) => {
    if (window.confirm(`Are you sure you want to archive ${studentName}?`)) {
      try {
        await studentService.archiveStudent(id);
        alert("Student archived successfully");
        loadStudents();
        loadStats();
      } catch (error) {
        alert("Failed to archive student");
        console.error("Archive error:", error);
      }
    }
  };

  const handleRestore = async (id: number, studentName: string) => {
    if (window.confirm(`Are you sure you want to restore ${studentName}?`)) {
      try {
        await studentService.restoreStudent(id);
        alert("Student restored successfully");
        loadStudents();
        loadStats();
      } catch (error) {
        alert("Failed to restore student");
        console.error("Restore error:", error);
      }
    }
  };

  const handleDelete = async (id: number, studentName: string) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete ${studentName}? This action cannot be undone.`,
      )
    ) {
      try {
        await studentService.deleteStudent(id);
        alert("Student deleted successfully");
        loadStudents();
        loadStats();
      } catch (error) {
        alert("Failed to delete student");
        console.error("Delete error:", error);
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStudent(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingStudent(null);
    loadStudents();
    // loadStats();
  };

  const exportToExcel = () => {
    if (activeStudents.length === 0) {
      alert("No active students to export");
      return;
    }

    // Prepare data for export
    const dataToExport = activeStudents.map((student) => ({
      "Student Number": student.student_number,
      "First Name": student.first_name,
      "Middle Name": student.middle_name || "",
      "Last Name": student.last_name,
      Course: student.course_name,
      Section: student.section_name,
      "RFID Tag": student.rfid_tag_number || "Not assigned",
      Status: student.is_active ? "Active" : "Inactive",
      "Student Status": student.student_status,
    }));

    // Create workbook and worksheet
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Active Students");

    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Student Number
      { wch: 15 }, // First Name
      { wch: 15 }, // Middle Name
      { wch: 15 }, // Last Name
      { wch: 20 }, // Course
      { wch: 12 }, // Section
      { wch: 20 }, // RFID Tag
      { wch: 12 }, // Status
      { wch: 18 }, // Student Status
    ];
    worksheet["!cols"] = columnWidths;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Active_Students_${timestamp}.xlsx`;

    // Write the file
    writeFile(workbook, filename);
  };
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course_name.toLowerCase().includes(searchTerm.toLowerCase());

    // If showing archived, include both archived and active
    // If not showing archived, only include active students
    const matchesArchiveStatus = showArchived
      ? student.is_archived
      : !student.is_archived;

    return matchesSearch && matchesArchiveStatus;
  });

  // Calculate active students for display
  const activeStudents = students.filter((s) => !s.is_archived);

  if (showForm) {
    return (
      <StudentForm
        student={editingStudent}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    );
  }

  const getImageUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `https://api-sas.slarenasitsolutions.com/public/${path}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {showArchived ? "Archived Students" : "Students"}
          </h1>
          <p className="text-slate-600">
            {showArchived
              ? `Viewing archived students (${filteredStudents.length} total)`
              : `Manage your student database (${activeStudents.length} active students)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? (
              <>
                <User className="h-4 w-4 mr-2" />
                View Active Students
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                View Archived
              </>
            )}
          </Button>
          <Button variant="outline" onClick={loadStudents} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {!showArchived && (
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={`Search ${showArchived ? "archived" : "active"} students by name, ID, or course...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={activeStudents.length === 0}
                title="Export active students to Excel"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Active Students
                </p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {stats.active_students}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Regular Status
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-2">
                  {stats.regular_students}
                </p>
              </div>
              <User className="h-10 w-10 text-emerald-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-900">With RFID</p>
                <p className="text-2xl font-bold text-amber-700 mt-2">
                  {stats.students_with_rfid}
                </p>
              </div>
              <Search className="h-10 w-10 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Archived</p>
                <p className="text-2xl font-bold text-slate-700 mt-2">
                  {stats.archived_students}
                </p>
              </div>
              <Archive className="h-10 w-10 text-slate-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>
            {showArchived
              ? "Archived Student Records"
              : "Active Student Records"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-500">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">
                {showArchived
                  ? "No archived students found"
                  : "No students found"}
              </h3>
              <p className="text-slate-500 mt-1">
                {searchTerm
                  ? "Try a different search term"
                  : showArchived
                    ? "No students have been archived yet"
                    : "Get started by adding a new student"}
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
                      Course & Section
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      RFID Tag
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
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                            {student.profile_picture ? (
                              <img
                                src={getImageUrl(student.profile_picture)}
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
                              {student.last_name}, {student.first_name}
                              {student.middle_name &&
                                ` ${student.middle_name.charAt(0)}.`}
                            </div>
                            <div className="text-sm text-slate-500">
                              {student.student_number}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">
                            {student.course_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {student.section_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.rfid_tag_number ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs border-blue-200 text-blue-700"
                          >
                            {student.rfid_tag_number}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {student.is_archived ? (
                            <Badge variant="destructive" className="w-fit">
                              Archived
                            </Badge>
                          ) : (
                            <Badge
                              variant={
                                student.is_active ? "default" : "destructive"
                              }
                              className="w-fit"
                            >
                              {student.is_active ? "Active" : "Inactive"}
                            </Badge>
                          )}
                          <div className="text-xs text-slate-500">
                            {student.student_status}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {showArchived ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                onClick={() =>
                                  handleRestore(
                                    student.id,
                                    `${student.first_name} ${student.last_name}`,
                                  )
                                }
                              >
                                <Undo className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() =>
                                  handleDelete(
                                    student.id,
                                    `${student.first_name} ${student.last_name}`,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                onClick={() => handleEdit(student)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() =>
                                  handleArchive(
                                    student.id,
                                    `${student.first_name} ${student.last_name}`,
                                  )
                                }
                                disabled={student.is_archived}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
    </div>
  );
};

export default StudentList;
