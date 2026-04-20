import { useEffect, useState } from 'react';
import { utils, writeFile } from 'xlsx';
import { toast } from 'sonner';
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
    Briefcase,
    Edit,
    Archive,
    Search,
    Filter,
    Download,
    RefreshCw,
    CheckCircle,
    Trash2,
    Undo
} from 'lucide-react';
import { employeeService } from '@/services/api';
import type { Employee } from '@/services/api';
import EmployeeForm from './components/EmployeeForm';

const EmployeeList = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [stats] = useState({
        total_employees: 0,
        active_employees: 0,
        archived_employees: 0,
        employees_by_department: {}
    });

    useEffect(() => {
        // Clear cache before loading to ensure fresh data
        employeeService.clearCache();
        loadEmployees();
        //loadStats();
    }, [showArchived]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await employeeService.getAllEmployees(showArchived);
            // Ensure data is always an array - handle API response format
            if (Array.isArray(data)) {
                setEmployees(data);

            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error('Failed to load employees:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    // const loadStats = async () => {
    //     try {
    //         const data = await employeeService.getEmployeeStats();
    //         setStats(data);
    //     } catch (error) {
    //         console.error('Failed to load stats:', error);
    //     }
    // };

    const handleArchive = async (id: number, employeeName: string) => {
        if (window.confirm(`Are you sure you want to archive ${employeeName}?`)) {
            try {
                await employeeService.archiveEmployee(id);
                toast.success('Employee archived successfully');
                loadEmployees();
                //loadStats();
            } catch (error) {
                toast.error('Failed to archive employee');
                console.error('Archive error:', error);
            }
        }
    };

    const handleRestore = async (id: number, employeeName: string) => {
        if (window.confirm(`Are you sure you want to restore ${employeeName}?`)) {
            try {
                await employeeService.restoreEmployee(id);
                toast.success('Employee restored successfully');
                loadEmployees();
                //loadStats();
            } catch (error) {
                toast.error('Failed to restore employee');
                console.error('Restore error:', error);
            }
        }
    };

    const handleDelete = async (id: number, employeeName: string) => {
        if (window.confirm(`Are you sure you want to permanently delete ${employeeName}? This action cannot be undone.`)) {
            try {
                await employeeService.deleteEmployee(id);
                toast.success('Employee deleted successfully');
                loadEmployees();
               // loadStats();
            } catch (error) {
                toast.error('Failed to delete employee');
                console.error('Delete error:', error);
            }
        }
    };

    const handleEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setEditingEmployee(null);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingEmployee(null);
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingEmployee(null);
        loadEmployees();
       // loadStats();
    };

    const exportToExcel = () => {
        if (activeEmployees.length === 0) {
            toast.error('No active employees to export');
            return;
        }

        // Prepare data for export
        const dataToExport = activeEmployees.map(employee => ({
            'Employee Number': employee.employee_number,
            'First Name': employee.first_name,
            'Middle Name': employee.middle_name || '',
            'Last Name': employee.last_name,
            'Department': employee.department,
            'Position': employee.position,
            'RFID Tag': employee.rfid_tag_number || 'Not assigned',
            'Email': employee.email,
            'Contact Number': employee.contact_number,
            'Employment Status': employee.employment_status,
            'Status': employee.is_active ? 'Active' : 'Inactive',
        }));

        // Create workbook and worksheet
        const worksheet = utils.json_to_sheet(dataToExport);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Active Employees');

        // Set column widths for better readability
        const columnWidths = [
            { wch: 15 }, // Employee Number
            { wch: 15 }, // First Name
            { wch: 15 }, // Middle Name
            { wch: 15 }, // Last Name
            { wch: 20 }, // Department
            { wch: 20 }, // Position
            { wch: 20 }, // RFID Tag
            { wch: 25 }, // Email
            { wch: 15 }, // Contact Number
            { wch: 18 }, // Employment Status
            { wch: 12 }  // Status
        ];
        worksheet['!cols'] = columnWidths;

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Active_Employees_${timestamp}.xlsx`;

        // Write the file
        writeFile(workbook, filename);
    };

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.position.toLowerCase().includes(searchTerm.toLowerCase());

        // If showing archived, include both archived and active
        // If not showing archived, only include active employees
        const matchesArchiveStatus = showArchived
            ? employee.is_archived
            : !employee.is_archived;

        return matchesSearch && matchesArchiveStatus;
    });

    // Calculate active employees for display
    const activeEmployees = employees.filter(e => !e.is_archived);

    if (showForm) {
        return (
            <EmployeeForm
                employee={editingEmployee}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        {showArchived ? 'Archived Employees' : 'Employees'}
                    </h1>
                    <p className="text-slate-600">
                        {showArchived
                            ? `Viewing archived employees (${filteredEmployees.length} total)`
                            : `Manage your employee database (${activeEmployees.length} active employees)`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? (
                            <>
                                <Briefcase className="h-4 w-4 mr-2" />
                                View Active Employees
                            </>
                        ) : (
                            <>
                                <Archive className="h-4 w-4 mr-2" />
                                View Archived
                            </>
                        )}
                    </Button>
                    <Button variant="outline" onClick={loadEmployees} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {!showArchived && (
                        <Button
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                            onClick={handleAddNew}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Employee
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
                                    placeholder={`Search ${showArchived ? 'archived' : 'active'} employees by name, ID, department, or position...`}
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
                                disabled={activeEmployees.length === 0}
                                title="Export active employees to Excel"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-900">Active Employees</p>
                                <p className="text-2xl font-bold text-emerald-700 mt-2">
                                    {stats.active_employees}
                                </p>
                            </div>
                            <CheckCircle className="h-10 w-10 text-emerald-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-900">Total Employees</p>
                                <p className="text-2xl font-bold text-blue-700 mt-2">
                                    {stats.total_employees}
                                </p>
                            </div>
                            <Briefcase className="h-10 w-10 text-blue-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900">Archived</p>
                                <p className="text-2xl font-bold text-slate-700 mt-2">
                                    {stats.archived_employees}
                                </p>
                            </div>
                            <Archive className="h-10 w-10 text-slate-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employees Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle>
                        {showArchived ? 'Archived Employee Records' : 'Active Employee Records'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                            <p className="mt-4 text-slate-500">Loading employees...</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-12">
                            <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">
                                {showArchived ? 'No archived employees found' : 'No employees found'}
                            </h3>
                            <p className="text-slate-500 mt-1">
                                {searchTerm
                                    ? 'Try a different search term'
                                    : showArchived
                                        ? 'No employees have been archived yet'
                                        : 'Get started by adding a new employee'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold text-slate-700">Employee Info</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Department & Position</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Email</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmployees.map((employee) => (
                                        <TableRow
                                            key={employee.id}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-slate-900">
                                                        {employee.last_name}, {employee.first_name}
                                                        {employee.middle_name && ` ${employee.middle_name.charAt(0)}.`}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {employee.employee_number}
                                                    </div>
                                                    {employee.rfid_tag_number && (
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            RFID: {employee.rfid_tag_number}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-slate-900">{employee.department}</div>
                                                    <div className="text-sm text-slate-500">{employee.position}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-600 truncate">
                                                    {employee.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-600">
                                                    {employee.contact_number}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {employee.is_archived ? (
                                                        <Badge variant="destructive" className="w-fit">
                                                            Archived
                                                        </Badge>
                                                    ) : (
                                                        <>
                                                            <Badge
                                                                variant={employee.is_active ? "default" : "destructive"}
                                                                className="w-fit"
                                                            >
                                                                {employee.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </>
                                                    )}
                                                    <div className="text-xs text-slate-500">
                                                        {employee.employment_status}
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
                                                                onClick={() => handleRestore(employee.id, `${employee.first_name} ${employee.last_name}`)}
                                                            >
                                                                <Undo className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                onClick={() => handleDelete(employee.id, `${employee.first_name} ${employee.last_name}`)}
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
                                                                onClick={() => handleEdit(employee)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                onClick={() => handleArchive(employee.id, `${employee.first_name} ${employee.last_name}`)}
                                                                disabled={employee.is_archived}
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

export default EmployeeList;
