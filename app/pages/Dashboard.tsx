import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
    Users,
    Clock,
    CheckCircle,
    LogIn,
    RefreshCw,
    ScanLine,
    Megaphone,
    ClipboardList,
    User
} from 'lucide-react';
import { dashboardService } from '@/services/api';

interface DashboardData {
    total_students: number;
    present_today: number;
    time_in_only: number;
    completed: number;
    recent_attendance: RecentAttendance[];
}

interface RecentAttendance {
    student_number: string;
    full_name: string;
    time_in: string;
    time_out: string | null;
    profile_picture_url: string | null;
}

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        total_students: 0,
        present_today: 0,
        time_in_only: 0,
        completed: 0,
        recent_attendance: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await dashboardService.getDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timeString: string | null) => {
        if (!timeString) return '-';
        try {
            const date = new Date(timeString);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch {
            return timeString;
        }
    };

    const getImageUrl = (path: string | null): string | undefined => {
        if (!path) return undefined;
        if (path.startsWith('http')) return path;
        return `https://api-sas.slarenasitsolutions.com/public/${path}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Dashboard
                    </h1>
                    <p className="text-slate-600">
                        Welcome to SAS Admin - Monitor your student attendance system
                    </p>
                </div>
                <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-900">Total Students</p>
                                <p className="text-2xl font-bold text-blue-700 mt-2">
                                    {dashboardData.total_students}
                                </p>
                            </div>
                            <Users className="h-10 w-10 text-blue-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-900">Present Today</p>
                                <p className="text-2xl font-bold text-emerald-700 mt-2">
                                    {dashboardData.present_today}
                                </p>
                            </div>
                            <CheckCircle className="h-10 w-10 text-emerald-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-900">Timed In Only</p>
                                <p className="text-2xl font-bold text-amber-700 mt-2">
                                    {dashboardData.time_in_only}
                                </p>
                            </div>
                            <LogIn className="h-10 w-10 text-amber-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-900">Completed</p>
                                <p className="text-2xl font-bold text-purple-700 mt-2">
                                    {dashboardData.completed}
                                </p>
                            </div>
                            <Clock className="h-10 w-10 text-purple-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Attendance */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle>
                        Recent Attendance Records
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-slate-500">Loading attendance data...</p>
                        </div>
                    ) : dashboardData.recent_attendance.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">
                                No recent attendance records
                            </h3>
                            <p className="text-slate-500 mt-1">
                                Attendance records will appear here as students check in
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold text-slate-700">Student Info</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Time In</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Time Out</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dashboardData.recent_attendance.map((record, index) => (
                                        <TableRow
                                            key={index}
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
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <User className="w-5 h-5 text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {record.full_name}
                                                        </div>
                                                        <div className="text-sm text-slate-500">
                                                            {record.student_number}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {formatTime(record.time_in)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {formatTime(record.time_out)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {record.time_out ? (
                                                    <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 w-fit">
                                                        Completed
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-amber-200 text-amber-700 w-fit">
                                                        In Progress
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Access</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        to="/students"
                        className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 text-left no-underline"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6 text-blue-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-11.75A8.97 8.97 0 0112 4c-2.343 0-4.518.826-6.25 2.194"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">
                                    Manage Users
                                </h3>
                                <p className="text-sm text-slate-500">
                                    View, add, edit student records
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/kiosk"
                        className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-300 text-left no-underline"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                                <ScanLine className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">
                                    Kiosk Mode
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Full-screen attendance scanner
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/announcements"
                        className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-500 transition-all duration-300 text-left no-underline"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors">
                                <Megaphone className="w-6 h-6 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">
                                    Announcements
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Manage announcements
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/attendance"
                        className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-lime-500 transition-all duration-300 text-left no-underline"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-lime-100 rounded-xl group-hover:bg-lime-200 transition-colors">
                                <ClipboardList className="w-6 h-6 text-lime-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">
                                    Attendance
                                </h3>
                                <p className="text-sm text-slate-500">
                                    View detailed attendance records
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
