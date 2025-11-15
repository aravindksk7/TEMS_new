'use client';

import { useEffect, useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { bookingAPI, environmentAPI } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Bookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    environment_id: '',
    project_name: '',
    purpose: '',
    start_time: '',
    end_time: '',
    priority: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [actionModal, setActionModal] = useState({ visible: false, booking: null, action: null, notes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchEnvironments();
  }, []);

  const fetchBookings = async () => {
    try {
      let response;
      if (user?.role === 'admin' || user?.role === 'manager') {
        // Admins and managers see all bookings
        response = await bookingAPI.getAll({});
      } else {
        response = await bookingAPI.getMyBookings();
      }
      setBookings(response.data.bookings);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironments = async () => {
    try {
      const response = await environmentAPI.getAll({});
      setEnvironments(response.data.environments);
    } catch (error) {
      console.error('Failed to fetch environments');
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.environment_id || !formData.project_name || !formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Client-side validations
    const now = new Date();
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }
    if (start < now) {
      toast.error('Start time must be in the future');
      return;
    }

    if (formData.project_name.length > 200) {
      toast.error('Project name is too long');
      return;
    }

    try {
      setSubmitting(true);
      if (editingBookingId) {
        await bookingAPI.update(editingBookingId, formData);
        toast.success('Booking updated successfully');
      } else {
        await bookingAPI.create(formData);
        toast.success('Booking created successfully');
      }
      setShowModal(false);
      setEditingBookingId(null);
      setFormData({
        environment_id: '',
        project_name: '',
        purpose: '',
        start_time: '',
        end_time: '',
        priority: 'medium'
      });
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Open action modal for approve/deny with optional notes
  const openActionModal = (booking, action) => {
    setActionModal({ visible: true, booking, action, notes: '' });
  };

  const confirmAction = async () => {
    const { booking, action, notes } = actionModal;
    if (!booking || !action) return;
    try {
      setActionLoading(true);
      await bookingAPI.updateStatus(booking.id, { status: action === 'approve' ? 'approved' : 'rejected', notes });
      toast.success(`Booking ${action === 'approve' ? 'approved' : 'rejected'}`);
      setActionModal({ visible: false, booking: null, action: null, notes: '' });
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (booking) => {
    if (!booking) return;
    const ok = window.confirm('Are you sure you want to delete this booking? This action cannot be undone.');
    if (!ok) return;
    try {
      setActionLoading(true);
      await bookingAPI.delete(booking.id);
      toast.success('Booking deleted');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete booking');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Booking
        </button>
      </div>

                    {submitting && (
                      <div className="w-full flex justify-center mb-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">{editingBookingId ? 'Edit Booking' : 'Create New Booking'}</h3>
              <button
                onClick={() => { setShowModal(false); setEditingBookingId(null); setFormData({ environment_id: '', project_name: '', purpose: '', start_time: '', end_time: '', priority: 'medium' }); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              {submitting && (
                <div className="w-full flex justify-center mb-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment *</label>
                <select
                  value={formData.environment_id}
                  onChange={(e) => setFormData({ ...formData, environment_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an environment</option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Project Alpha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Why do you need this environment?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingBookingId(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (editingBookingId ? 'Saving...' : 'Creating...') : (editingBookingId ? 'Save' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">{actionModal.action === 'approve' ? 'Approve Booking' : 'Reject Booking'}</h3>
              <button
                onClick={() => setActionModal({ visible: false, booking: null, action: null, notes: '' })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4">Provide optional notes for the approver's decision:</p>
              <textarea
                value={actionModal.notes}
                onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Optional notes..."
              />
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActionModal({ visible: false, booking: null, action: null, notes: '' })}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAction}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Working...' : (actionModal.action === 'approve' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.project_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{booking.environment_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(booking.start_time), 'MMM d, h:mm a')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(booking.end_time), 'MMM d, h:mm a')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full status-${booking.status}`}>{booking.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full priority-${booking.priority}`}>{booking.priority}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {/* Admin/manager controls */}
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <>
                          <button
                            onClick={() => openActionModal(booking, 'approve')}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openActionModal(booking, 'reject')}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => {
                              // open edit modal prefilled
                              setEditingBookingId(booking.id);
                              setFormData({
                                environment_id: booking.environment_id,
                                project_name: booking.project_name,
                                purpose: booking.purpose || '',
                                start_time: booking.start_time ? new Date(booking.start_time).toISOString().slice(0,16) : '',
                                end_time: booking.end_time ? new Date(booking.end_time).toISOString().slice(0,16) : '',
                                priority: booking.priority || 'medium'
                              });
                              setShowModal(true);
                            }}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                          >
                            Edit
                          </button>
                        </>
                      )}

                      {/* Owner delete control (or admin) */}
                      {(booking.user_id === user?.id || user?.role === 'admin' || user?.role === 'manager') && booking.status !== 'active' && (
                        <button
                          onClick={() => handleDelete(booking)}
                          className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
