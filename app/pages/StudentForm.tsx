import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    User,
    Mail,
    Phone,
    Calendar,
    BookOpen,
    Hash,
    AlertCircle,
    CheckCircle2,
    Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { studentService, type Student } from '@/services/api';

interface StudentFormProps {
    student?: Student | null;
    onClose: () => void;
    onSuccess: () => void;
}

const StudentForm = ({ student, onClose, onSuccess }: StudentFormProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        rfid_tag_number: '',
        student_number: '',
        student_status: 'Regular',
        is_active: true,
        course_name: '',
        section_name: '',
        school_year: new Date().getFullYear().toString(),
        semester: '1st Semester',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'Male',
        birthdate: '',
        email: '',
        contact_number: '',
        guardian_contact_number: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (student) {
            // Format date for input field (YYYY-MM-DD)
            const formattedBirthdate = student.birthdate
                ? student.birthdate.split('T')[0]
                : '';

            setFormData({
                rfid_tag_number: student.rfid_tag_number || '',
                student_number: student.student_number || '',
                student_status: student.student_status || 'Regular',
                is_active: student.is_active,
                course_name: student.course_name || '',
                section_name: student.section_name || '',
                school_year: student.school_year || new Date().getFullYear().toString(),
                semester: student.semester || '1st Semester',
                first_name: student.first_name || '',
                middle_name: student.middle_name || '',
                last_name: student.last_name || '',
                gender: student.gender || 'Male',
                birthdate: formattedBirthdate,
                email: student.email || '',
                contact_number: student.contact_number || '',
                guardian_contact_number: student.guardian_contact_number || '',
            });
        }
    }, [student]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                [name]: checkbox.checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Required fields validation
        if (!formData.rfid_tag_number.trim()) newErrors.rfid_tag_number = 'RFID Tag Number is required for attendance scanning';
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.student_number.trim()) newErrors.student_number = 'Student number is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
        if (!formData.guardian_contact_number.trim()) newErrors.guardian_contact_number = 'Guardian contact number is required';
        if (!formData.birthdate.trim()) newErrors.birthdate = 'Birthdate is required';
        if (!formData.course_name.trim()) newErrors.course_name = 'Course name is required';
        if (!formData.section_name.trim()) newErrors.section_name = 'Section name is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            setError('Please fill in all required fields correctly.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (student) {
                // Update existing student
                await studentService.updateStudent(student.id, formData);
                setSuccess('Student updated successfully!');
            } else {
                // Create new student
                await studentService.createStudent(formData);
                setSuccess('Student created successfully!');
            }

            // Wait a moment to show success message, then close
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err: any) {
            console.error('Error saving student:', err);

            if (err.response?.data?.errors) {
                // Handle Laravel validation errors
                const errorMessages = Object.values(err.response.data.errors).flat();
                setError(errorMessages.join(', '));

                // Set field-specific errors
                if (err.response.data.errors) {
                    const fieldErrors: Record<string, string> = {};
                    Object.entries(err.response.data.errors).forEach(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            fieldErrors[field] = messages[0];
                        }
                    });
                    setErrors(fieldErrors);
                }
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to save student. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const schoolYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="border-slate-200 shadow-lg">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900">
                                    {student ? 'Edit Student' : 'Add New Student'}
                                </CardTitle>
                                <p className="text-slate-600 text-sm">
                                    {student ? 'Update student information' : 'Fill in the student details below'}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            disabled={loading}
                            className="hover:bg-slate-200"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6 space-y-6">
                        {/* Error/Success Messages */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-500/30">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <AlertDescription className="text-emerald-700">
                                    {success}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* RFID Section - MOVED TO TOP */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Radio className="w-5 h-5 text-blue-600" />
                                RFID Information
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rfid_tag_number" className="text-slate-700 font-semibold">
                                        RFID Tag Number *
                                        <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            Required for attendance scanning
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <Radio className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                                        <Input
                                            id="rfid_tag_number"
                                            name="rfid_tag_number"
                                            value={formData.rfid_tag_number}
                                            onChange={handleChange}
                                            placeholder="e.g., 1234567890 (Scan RFID card or enter manually)"
                                            className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                        This unique RFID number is essential for the student to scan attendance in kiosk mode.
                                    </div>
                                    {errors.rfid_tag_number && (
                                        <p className="text-sm text-red-600 mt-1">{errors.rfid_tag_number}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Student Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Student Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* First Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="first_name" className="text-slate-700">
                                        First Name *
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            placeholder="Enter first name"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.first_name && (
                                        <p className="text-sm text-red-600">{errors.first_name}</p>
                                    )}
                                </div>

                                {/* Middle Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="middle_name" className="text-slate-700">
                                        Middle Name
                                    </Label>
                                    <Input
                                        id="middle_name"
                                        name="middle_name"
                                        value={formData.middle_name}
                                        onChange={handleChange}
                                        placeholder="Enter middle name"
                                        disabled={loading}
                                    />
                                </div>

                                {/* Last Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="last_name" className="text-slate-700">
                                        Last Name *
                                    </Label>
                                    <Input
                                        id="last_name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Enter last name"
                                        disabled={loading}
                                    />
                                    {errors.last_name && (
                                        <p className="text-sm text-red-600">{errors.last_name}</p>
                                    )}
                                </div>

                                {/* Student Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="student_number" className="text-slate-700">
                                        Student Number *
                                    </Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="student_number"
                                            name="student_number"
                                            value={formData.student_number}
                                            onChange={handleChange}
                                            placeholder="e.g., 2023-00123"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.student_number && (
                                        <p className="text-sm text-red-600">{errors.student_number}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700">
                                        Email Address *
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="student@school.edu"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-sm text-red-600">{errors.email}</p>
                                    )}
                                </div>

                                {/* Contact Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="contact_number" className="text-slate-700">
                                        Contact Number *
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="contact_number"
                                            name="contact_number"
                                            value={formData.contact_number}
                                            onChange={handleChange}
                                            placeholder="e.g., 09123456789"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.contact_number && (
                                        <p className="text-sm text-red-600">{errors.contact_number}</p>
                                    )}
                                </div>

                                {/* Guardian Contact Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="guardian_contact_number" className="text-slate-700">
                                        Guardian Contact Number *
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="guardian_contact_number"
                                            name="guardian_contact_number"
                                            value={formData.guardian_contact_number}
                                            onChange={handleChange}
                                            placeholder="e.g., 09123456789"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.guardian_contact_number && (
                                        <p className="text-sm text-red-600">{errors.guardian_contact_number}</p>
                                    )}
                                </div>

                                {/* Birthdate */}
                                <div className="space-y-2">
                                    <Label htmlFor="birthdate" className="text-slate-700">
                                        Birthdate *
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="birthdate"
                                            type="date"
                                            name="birthdate"
                                            value={formData.birthdate}
                                            onChange={handleChange}
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.birthdate && (
                                        <p className="text-sm text-red-600">{errors.birthdate}</p>
                                    )}
                                </div>

                                {/* Gender */}
                                <div className="space-y-2">
                                    <Label htmlFor="gender" className="text-slate-700">
                                        Gender *
                                    </Label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.gender && (
                                        <p className="text-sm text-red-600">{errors.gender}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Academic Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                Academic Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Course */}
                                <div className="space-y-2">
                                    <Label htmlFor="course_name" className="text-slate-700">
                                        Course *
                                    </Label>
                                    <Input
                                        id="course_name"
                                        name="course_name"
                                        value={formData.course_name}
                                        onChange={handleChange}
                                        placeholder="e.g., Bachelor of Science in Computer Science"
                                        disabled={loading}
                                    />
                                    {errors.course_name && (
                                        <p className="text-sm text-red-600">{errors.course_name}</p>
                                    )}
                                </div>

                                {/* Section */}
                                <div className="space-y-2">
                                    <Label htmlFor="section_name" className="text-slate-700">
                                        Section *
                                    </Label>
                                    <Input
                                        id="section_name"
                                        name="section_name"
                                        value={formData.section_name}
                                        onChange={handleChange}
                                        placeholder="e.g., BSCS 3A"
                                        disabled={loading}
                                    />
                                    {errors.section_name && (
                                        <p className="text-sm text-red-600">{errors.section_name}</p>
                                    )}
                                </div>

                                {/* School Year */}
                                <div className="space-y-2">
                                    <Label htmlFor="school_year" className="text-slate-700">
                                        School Year *
                                    </Label>
                                    <select
                                        id="school_year"
                                        name="school_year"
                                        value={formData.school_year}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {schoolYears.map(year => (
                                            <option key={year} value={year}>
                                                {year} - {parseInt(year) + 1}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.school_year && (
                                        <p className="text-sm text-red-600">{errors.school_year}</p>
                                    )}
                                </div>

                                {/* Semester */}
                                <div className="space-y-2">
                                    <Label htmlFor="semester" className="text-slate-700">
                                        Semester *
                                    </Label>
                                    <select
                                        id="semester"
                                        name="semester"
                                        value={formData.semester}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="1st Semester">1st Semester</option>
                                        <option value="2nd Semester">2nd Semester</option>
                                        <option value="Summer">Summer</option>
                                    </select>
                                    {errors.semester && (
                                        <p className="text-sm text-red-600">{errors.semester}</p>
                                    )}
                                </div>

                                {/* Student Status */}
                                <div className="space-y-2">
                                    <Label htmlFor="student_status" className="text-slate-700">
                                        Student Status *
                                    </Label>
                                    <select
                                        id="student_status"
                                        name="student_status"
                                        value={formData.student_status}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Regular">Regular</option>
                                        <option value="Irregular">Irregular</option>
                                        <option value="Transferee">Transferee</option>
                                        <option value="Returning">Returning</option>
                                        <option value="Scholar">Scholar</option>
                                    </select>
                                    {errors.student_status && (
                                        <p className="text-sm text-red-600">{errors.student_status}</p>
                                    )}
                                </div>

                                {/* Active Status - Moved here to keep it with other status fields */}
                                <div className="space-y-2">
                                    <Label htmlFor="is_active" className="text-slate-700">
                                        Student Status
                                    </Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                is_active: e.target.checked
                                            }))}
                                            disabled={loading}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label
                                            htmlFor="is_active"
                                            className="text-slate-700 font-medium"
                                        >
                                            Active Student
                                        </Label>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Inactive students cannot scan for attendance in kiosk mode
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="border-t border-slate-100 p-6 flex justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="border-slate-300 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white min-w-[120px]"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {student ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {student ? 'Update Student' : 'Create Student'}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default StudentForm;