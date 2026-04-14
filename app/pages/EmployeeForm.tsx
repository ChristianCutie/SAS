import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Briefcase,
    Mail,
    Phone,
    Calendar,
    AlertCircle,
    CheckCircle2,
    User,
    Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { employeeService, type Employee } from '@/services/api';

interface EmployeeFormProps {
    employee?: Employee | null;
    onClose: () => void;
    onSuccess: () => void;
}

const EmployeeForm = ({ employee, onClose, onSuccess }: EmployeeFormProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        rfid_tag_number: '',
        employee_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'Male',
        birthdate: '',
        email: '',
        contact_number: '',
        department: '',
        position: '',
        employment_status: 'Permanent',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (employee) {
            // Format date for input field (YYYY-MM-DD)
            const formattedBirthdate = employee.birthdate
                ? employee.birthdate.split('T')[0]
                : '';

            setFormData({
                rfid_tag_number: employee.rfid_tag_number || '',
                employee_number: employee.employee_number || '',
                first_name: employee.first_name || '',
                middle_name: employee.middle_name || '',
                last_name: employee.last_name || '',
                gender: employee.gender || 'Male',
                birthdate: formattedBirthdate,
                email: employee.email || '',
                contact_number: employee.contact_number || '',
                department: employee.department || '',
                position: employee.position || '',
                employment_status: employee.employment_status || 'Permanent',
                is_active: employee.is_active,
            });
        }
    }, [employee]);

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
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.employee_number.trim()) newErrors.employee_number = 'Employee number is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
        if (!formData.birthdate.trim()) newErrors.birthdate = 'Birthdate is required';
        if (!formData.department.trim()) newErrors.department = 'Department is required';
        if (!formData.position.trim()) newErrors.position = 'Position is required';

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
            // Prepare data for submission
            const submitData = { ...formData } as any;
            Object.entries(submitData).forEach(([key, value]) => {
                if (typeof value === 'boolean') {
                    submitData[key] = value ? 1 : 0;
                }
            });

            if (employee) {
                // Update existing employee
                await employeeService.updateEmployee(employee.id, submitData);
                setSuccess('Employee updated successfully!');
            } else {
                // Create new employee
                await employeeService.createEmployee(submitData);
                setSuccess('Employee created successfully!');
            }

            // Wait a moment to show success message, then close
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err: any) {
            console.error('Error saving employee:', err);

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
                setError('Failed to save employee. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="border-slate-200 shadow-lg">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                                <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900">
                                    {employee ? 'Edit Employee' : 'Add New Employee'}
                                </CardTitle>
                                <p className="text-slate-600 text-sm">
                                    {employee ? 'Update employee information' : 'Fill in the employee details below'}
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

                        {/* Employee Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Personal Information
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
                            </div>
                        </div>

                        {/* Contact Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-600" />
                                Contact Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            placeholder="employee@company.com"
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
                            </div>
                        </div>

                        {/* Employment Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                                Employment Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Employee Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="employee_number" className="text-slate-700">
                                        Employee Number *
                                    </Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="employee_number"
                                            name="employee_number"
                                            value={formData.employee_number}
                                            onChange={handleChange}
                                            placeholder="e.g., EMP-2024-001"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.employee_number && (
                                        <p className="text-sm text-red-600">{errors.employee_number}</p>
                                    )}
                                </div>

                                {/* Department */}
                                <div className="space-y-2">
                                    <Label htmlFor="department" className="text-slate-700">
                                        Department *
                                    </Label>
                                    <Input
                                        id="department"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        placeholder="e.g., Human Resources"
                                        disabled={loading}
                                    />
                                    {errors.department && (
                                        <p className="text-sm text-red-600">{errors.department}</p>
                                    )}
                                </div>

                                {/* Position */}
                                <div className="space-y-2">
                                    <Label htmlFor="position" className="text-slate-700">
                                        Position *
                                    </Label>
                                    <Input
                                        id="position"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        placeholder="e.g., Senior Manager"
                                        disabled={loading}
                                    />
                                    {errors.position && (
                                        <p className="text-sm text-red-600">{errors.position}</p>
                                    )}
                                </div>

                                {/* Employment Status */}
                                <div className="space-y-2">
                                    <Label htmlFor="employment_status" className="text-slate-700">
                                        Employment Status *
                                    </Label>
                                    <select
                                        id="employment_status"
                                        name="employment_status"
                                        value={formData.employment_status}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Permanent">Permanent</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Temporary">Temporary</option>
                                        <option value="Part-time">Part-time</option>
                                    </select>
                                </div>

                                {/* Active Status */}
                                <div className="space-y-2">
                                    <Label htmlFor="is_active" className="text-slate-700">
                                        Employee Status
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
                                            Active Employee
                                        </Label>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Inactive employees cannot scan for attendance in kiosk mode
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Identification Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Hash className="w-5 h-5 text-blue-600" />
                                Identification Information
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rfid_tag_number" className="text-slate-700 font-semibold">
                                        RFID Tag Number *
                                        <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            Required for identification
                                        </span>
                                    </Label>
                                    <Input
                                        id="rfid_tag_number"
                                        name="rfid_tag_number"
                                        value={formData.rfid_tag_number}
                                        onChange={handleChange}
                                        placeholder="e.g., TAG-2024-001"
                                        className=""
                                        disabled={loading || !!employee}
                                        maxLength={250}
                                    />
                                    {errors.rfid_tag_number && (
                                        <p className="text-sm text-red-600">{errors.rfid_tag_number}</p>
                                    )}
                                    <p className="text-sm text-slate-500 mt-1">
                                        Enter the unique RFID tag number assigned to this employee.
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
                                    {employee ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {employee ? 'Update Employee' : 'Create Employee'}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default EmployeeForm;
