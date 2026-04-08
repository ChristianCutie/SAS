import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert } from '../components/ui/alert';
import { X } from 'lucide-react';

interface Announcement {
  id: number;
  content: string;
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

  const API_BASE_URL = 'https://api-sas.slarenasitsolutions.com/public/api';

  // Fetch announcements on component mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Fetch all announcements
  const fetchAnnouncements = async () => {
    try {
      setFetchLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${API_BASE_URL}/announcements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      setAnnouncements(response.data);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. Please try again.');
    } finally {
      setFetchLoading(false);
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

      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_BASE_URL}/announcements`,
        { content },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      // Add new announcement to list
      setAnnouncements([response.data.data, ...announcements]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-10xl mx-auto">
        {/* Header with Button */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Announcements</h1>
            <p className="text-slate-600">Manage and share important announcements with students</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 h-fit"
          >
            + Add Announcement
          </Button>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <Alert className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            {success}
          </Alert>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900">Create New Announcement</h2>
                  <button
                    onClick={closeModal}
                    className="text-slate-500 hover:text-slate-700 transition"
                  >
                    <X size={24} />
                  </button>
                </div>

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
                      className="bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Announcements Table */}
        <Card className="shadow-lg overflow-hidden">
          {fetchLoading ? (
            <div className="p-12 text-center">
              <p className="text-slate-600">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-600">No announcements yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Content</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Created Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Updated Date</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((announcement, index) => (
                    <tr
                      key={announcement.id}
                      className={`border-b border-slate-200 hover:bg-blue-50 transition ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">#{announcement.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">
                        {announcement.content}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(announcement.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(announcement.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Announcement;
