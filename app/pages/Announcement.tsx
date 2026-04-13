import React, { useState, useEffect } from 'react';
import { announcementService } from '../services/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert } from '../components/ui/alert';
import Switch from '../components/ui/switch';
import {
  Plus,
  Trash2,
  Search,
  Filter,
  Download,
  RefreshCw,
  Bell,
  X
} from 'lucide-react';

interface Announcement {
  id: number;
  content: string;
  title?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const Announcement = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total_announcements: 0,
    today_announcements: 0,
  });
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  // const API_BASE_URL = 'https://api-sas.slarenasitsolutions.com/public/api';

  // Fetch announcements on component mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Fetch all announcements
  const fetchAnnouncements = async () => {
    try {
      setFetchLoading(true);
      setError(null);
      
      const data = await announcementService.getAnnouncements();
      setAnnouncements(data);
      calculateStats(data);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. Please try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: Announcement[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = data.filter((announcement) => {
      const createdDate = new Date(announcement.created_at);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === today.getTime();
    }).length;

    setStats({
      total_announcements: data.length,
      today_announcements: todayCount,
    });
  };

  // Toggle announcement active status
  const handleToggleActive = async (id: number, currentStatus: number) => {
    try {
      setToggleLoading(id);
      const newStatus = currentStatus === 1 ? 0 : 1;
      
      await announcementService.updateAnnouncement(id, { is_active: newStatus });

      // Update the announcement in the list
      setAnnouncements(announcements.map(announcement => 
        announcement.id === id 
          ? { ...announcement, is_active: newStatus }
          : announcement
      ));
      setSuccess('Announcement status updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling announcement:', err);
      setError(err.response?.data?.message || 'Failed to update announcement status.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setToggleLoading(null);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      setDeleteLoading(id);
      await announcementService.deleteAnnouncement(id);

      // Remove from list
      setAnnouncements(announcements.filter(announcement => announcement.id !== id));
      setSuccess('Announcement deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setError(err.response?.data?.message || 'Failed to delete announcement.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Create new announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter announcement content');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await announcementService.createAnnouncement(content);

      // Add new announcement to list
      setAnnouncements([response.data, ...announcements]);
      setContent('');
      setSuccess('Announcement created successfully!');
      
      // Close modal
      setIsModalOpen(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      setError(err.response?.data?.message || 'Failed to create announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setContent('');
    setError(null);
  };

  // Filter announcements based on search term
  const filteredAnnouncements = announcements.filter(announcement => {
    const searchLower = searchTerm.toLowerCase();
    return (
      announcement.content.toLowerCase().includes(searchLower) ||
      (announcement.title && announcement.title.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Announcements
          </h1>
          <p className="text-slate-600">
            Manage and share important announcements with students ({filteredAnnouncements.length} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchAnnouncements} disabled={fetchLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Announcement
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
          {success}
        </Alert>
      )}

      {/* Search and Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search announcements by content..."
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
              <Button variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Total Announcements</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {stats.total_announcements}
                </p>
              </div>
              <Bell className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">Today</p>
                <p className="text-2xl font-bold text-purple-700 mt-2">
                  {stats.today_announcements}
                </p>
              </div>
              <Bell className="h-10 w-10 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardHeader className="border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle>Create New Announcement</CardTitle>
                <button
                  onClick={closeModal}
                  className="text-slate-500 hover:text-slate-700 transition"
                >
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Modal Form */}
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <Label htmlFor="announcement-content" className="text-slate-700 font-medium mb-2">
                    Announcement Content
                  </Label>
                  <textarea
                    id="announcement-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your announcement message here..."
                    className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {error && (
                  <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                    {error}
                  </Alert>
                )}

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    onClick={closeModal}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Announcements Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Announcement Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fetchLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-500">Loading announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">
                {searchTerm ? 'No announcements found' : 'No announcements yet'}
              </h3>
              <p className="text-slate-500 mt-1">
                {searchTerm
                  ? 'Try a different search term'
                  : 'Get started by creating a new announcement'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-700">Content</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Created Date</TableHead>
                    <TableHead className="font-semibold text-slate-700">Updated Date</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnnouncements.map((announcement) => (
                    <TableRow
                      key={announcement.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-slate-900 font-medium" title={announcement.content}>
                            {announcement.content.length > 70 
                              ? announcement.content.substring(0, 70) + '...' 
                              : announcement.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Switch
                            checked={announcement.is_active === 1}
                            onCheckedChange={() => handleToggleActive(announcement.id, announcement.is_active)}
                            disabled={toggleLoading === announcement.id}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(announcement.created_at)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(announcement.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            disabled={deleteLoading === announcement.id}
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
    </div>
  );
};

export default Announcement;
