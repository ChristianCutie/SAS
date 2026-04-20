import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Menu,
    X,
    User,
    Home,
    Users,
    Briefcase,
    LogOut,
    ScanLine,
    ChevronDown,
    Megaphone,
    ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authService } from '@/services/api';
import { toast } from 'sonner';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Students', href: '/students', icon: Users },
        { name: 'Employees', href: '/employees', icon: Briefcase },
        { name: 'Announcements', href: '/announcements', icon: Megaphone },
        { name: 'Attendance', href: '/attendance', icon: ClipboardList },
        { name: 'Kiosk', href: '/', icon: ScanLine },
    ];

    const handleLogout = async () => {
        // Show confirmation toast
        toast.loading('Logging you out...', {
            id: 'logout-confirm',
        });

        try {
            await authService.logout();
            toast.success('Logged out successfully!', {
                id: 'logout-confirm',
            });
            setTimeout(() => {
                navigate('/login');
            }, 500);
        } catch (error) {
            toast.error('Logout failed. Please try again.', {
                id: 'logout-confirm',
            });
            console.error('Logout failed:', error);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="flex items-center">
                                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <ScanLine className="h-5 w-5 text-white" />
                                </div>
                                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    SAS
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:ml-8 md:flex md:space-x-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-100'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className={`mr-2 h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                        {item.name}
                                        {active && (
                                            <div className="ml-2 h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center space-x-3">
                        {/* Time Display */}
                        <div className="hidden lg:block">
                            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 me-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {new Date().toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date().toLocaleDateString([], {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* User Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-10 w-10 rounded-full hover:bg-gray-50 transition-all duration-200"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src="https://api.dicebear.com/9.x/thumbs/svg?seed=Aneka" />
                                       
                                    </Avatar>
                                    <ChevronDown className="h-3 w-3 ml-1 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">Administrator</p>
                                        <p className="text-xs leading-none text-gray-500">
                                            admin@attendancepro.com
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">
                                    <ScanLine className="mr-2 h-4 w-4" />
                                    <span>Kiosk Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 hover:bg-red-50"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none transition-colors duration-200"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? (
                                <X className="block h-6 w-6" />
                            ) : (
                                <Menu className="block h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg absolute top-16 left-0 right-0 shadow-lg">
                    <div className="px-4 pt-2 pb-3 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${active
                                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-100'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                    {item.name}
                                    {active && (
                                        <div className="ml-auto h-2 w-2 bg-blue-600 rounded-full"></div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="pt-4 pb-3 border-t border-gray-100">
                        <div className="flex items-center px-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                    AD
                                </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                                <div className="text-base font-medium text-gray-800">
                                    Administrator
                                </div>
                                <div className="text-sm font-medium text-gray-500">
                                    admin@attendancepro.com
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 px-4 space-y-1">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;