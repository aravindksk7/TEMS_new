'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  CircularProgress,
  Badge,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  CalendarMonth,
  Timeline,
  Warning,
  Check,
  Edit,
  Delete,
  Close
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { monitoringAPI, analyticsAPI, bookingAPI, releaseAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function MonitoringMUI({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [conflicts, setConflicts] = useState([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState({ visible: false, conflict: null, notes: '' });
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [editBookingModal, setEditBookingModal] = useState({ visible: false, booking: null });
  const [releaseStats, setReleaseStats] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 1) fetchConflicts();
    if (activeTab === 2) fetchCalendarBookings();
    if (activeTab === 3) fetchReleaseStats();
  }, [activeTab, selectedDate]);

  const fetchMonitoring = async () => {
    try {
      const response = await monitoringAPI.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      setConflictLoading(true);
      const resp = await analyticsAPI.getConflicts({});
      setConflicts(resp.data.conflictDetails || []);
    } catch (err) {
      console.error('Failed to fetch conflicts', err);
    } finally {
      setConflictLoading(false);
    }
  };

  const fetchCalendarBookings = async () => {
    try {
      const startOfMonth = selectedDate.startOf('month').format('YYYY-MM-DD 00:00:00');
      const endOfMonth = selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59');
      const resp = await bookingAPI.getAll({ start_date: startOfMonth, end_date: endOfMonth });
      setCalendarBookings(resp.data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch calendar bookings', err);
    }
  };

  const fetchReleaseStats = async () => {
    try {
      setReleaseLoading(true);
      const response = await releaseAPI.getStatistics();
      setReleaseStats(response.data);
    } catch (err) {
      console.error('Failed to fetch release statistics', err);
    } finally {
      setReleaseLoading(false);
    }
  };

  const openResolve = (c) => setResolveModal({ visible: true, conflict: c, notes: '' });

  const confirmResolve = async () => {
    try {
      await analyticsAPI.resolveConflict(resolveModal.conflict.id, { 
        resolution_notes: resolveModal.notes 
      });
      toast.success('Conflict resolved successfully');
      setResolveModal({ visible: false, conflict: null, notes: '' });
      fetchConflicts();
      fetchMonitoring();
    } catch (err) {
      toast.error('Failed to resolve conflict');
      console.error('Resolve failed', err);
    }
  };

  const openEditBooking = (booking) => {
    setEditBookingModal({
      visible: true,
      booking: {
        ...booking,
        start_time: dayjs(booking.start_time),
        end_time: dayjs(booking.end_time)
      }
    });
  };

  const handleUpdateBooking = async () => {
    try {
      const { booking } = editBookingModal;
      await bookingAPI.update(booking.id, {
        start_time: booking.start_time.format('YYYY-MM-DD HH:mm:ss'),
        end_time: booking.end_time.format('YYYY-MM-DD HH:mm:ss'),
        project_name: booking.project_name,
        priority: booking.priority,
        status: booking.status
      });
      toast.success('Booking updated successfully');
      setEditBookingModal({ visible: false, booking: null });
      fetchCalendarBookings();
    } catch (err) {
      toast.error('Failed to update booking');
      console.error('Update failed', err);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      await bookingAPI.delete(bookingId);
      toast.success('Booking deleted successfully');
      fetchCalendarBookings();
    } catch (err) {
      toast.error('Failed to delete booking');
      console.error('Delete failed', err);
    }
  };

  const getBookingsForDate = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return calendarBookings.filter(booking => {
      const bookingDate = dayjs(booking.start_time).format('YYYY-MM-DD');
      return bookingDate === dateStr;
    });
  };

  const canModifyBooking = (booking) => {
    // User can modify if they own the booking or are admin/manager
    return booking.user_id === user.id || ['admin', 'manager'].includes(user.role);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight={600}>
            Real-Time Monitoring
          </Typography>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth">
            <Tab icon={<Timeline />} label="Dashboard" />
            <Tab icon={<Warning />} label="Conflicts" />
            <Tab icon={<CalendarMonth />} label="Calendar" />
            <Tab icon={<Timeline />} label="Releases" />
          </Tabs>
        </Paper>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Check color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Active Bookings</Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={600}>
                    {dashboard?.activeBookings || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Warning color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Unresolved Conflicts</Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={600}>
                    {dashboard?.unresolvedConflicts || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Warning color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6">Critical Environments</Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={600}>
                    {dashboard?.criticalEnvironments?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Unresolved Conflicts
              </Typography>
              {conflictLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : conflicts.length === 0 ? (
                <Typography color="text.secondary" align="center" py={4}>
                  No conflicts found
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Detected At</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conflicts.map((conflict) => (
                        <TableRow key={conflict.id} hover>
                          <TableCell>{conflict.id}</TableCell>
                          <TableCell>{conflict.conflict_type}</TableCell>
                          <TableCell>
                            <Chip 
                              label={conflict.severity} 
                              color={getSeverityColor(conflict.severity)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {conflict.detected_at 
                              ? dayjs(conflict.detected_at).format('MMM D, YYYY h:mm A')
                              : '-'
                            }
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => openResolve(conflict)}
                              startIcon={<Check />}
                            >
                              Resolve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <DateCalendar
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    slots={{
                      day: (dayProps) => {
                        const bookings = getBookingsForDate(dayProps.day);
                        const hasBookings = bookings.length > 0;
                        return (
                          <Badge
                            badgeContent={hasBookings ? bookings.length : null}
                            color="primary"
                            overlap="circular"
                          >
                            <PickersDay {...dayProps} />
                          </Badge>
                        );
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2}>
                    Bookings for {selectedDate.format('MMMM D, YYYY')}
                  </Typography>
                  {getBookingsForDate(selectedDate).length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>
                      No bookings for this date
                    </Typography>
                  ) : (
                    <Box>
                      {getBookingsForDate(selectedDate).map((booking) => (
                        <Card key={booking.id} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="start">
                              <Box flex={1}>
                                <Typography variant="h6" gutterBottom>
                                  {booking.project_name || '(No title)'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Environment: {booking.environment_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {dayjs(booking.start_time).format('h:mm A')} - {dayjs(booking.end_time).format('h:mm A')}
                                </Typography>
                                <Box mt={1}>
                                  <Chip
                                    label={booking.status}
                                    color={getStatusColor(booking.status)}
                                    size="small"
                                    sx={{ mr: 1 }}
                                  />
                                  <Chip
                                    label={booking.priority}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>
                              {canModifyBooking(booking) && (
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditBooking(booking)}
                                    color="primary"
                                  >
                                    <Edit />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteBooking(booking.id)}
                                    color="error"
                                  >
                                    <Delete />
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === 3 && (
          <Box>
            {releaseLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : releaseStats ? (
              <Grid container spacing={3}>
                {/* Environment Stats */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" mb={3}>Release Status by Environment</Typography>
                      <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={releaseStats.environmentStats || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="environment_name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="passed" stackId="a" fill="#4caf50" name="Passed" />
                          <Bar dataKey="in_progress" stackId="a" fill="#2196f3" name="In Progress" />
                          <Bar dataKey="failed" stackId="a" fill="#f44336" name="Failed" />
                          <Bar dataKey="blocked" stackId="a" fill="#ff9800" name="Blocked" />
                          <Bar dataKey="not_started" stackId="a" fill="#9e9e9e" name="Not Started" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Release Status Distribution */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" mb={2}>Release Status Distribution</Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={releaseStats.statusDistribution || []}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={(entry) => `${entry.status}: ${entry.count}`}
                          >
                            {(releaseStats.statusDistribution || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Release Timeline */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" mb={2}>Release Timeline (Last 6 Months)</Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={releaseStats.timeline || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="completed" stroke="#4caf50" name="Completed" strokeWidth={2} />
                          <Line type="monotone" dataKey="deployed" stroke="#2196f3" name="Deployed" strokeWidth={2} />
                          <Line type="monotone" dataKey="testing" stroke="#ff9800" name="Testing" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Active Releases Table */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" mb={2}>Active Releases</Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Release</TableCell>
                              <TableCell>Version</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Target Date</TableCell>
                              <TableCell align="right">Environments</TableCell>
                              <TableCell align="right">Passed</TableCell>
                              <TableCell align="right">Failed</TableCell>
                              <TableCell align="right">Testing</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(releaseStats.activeReleases || []).map((release) => (
                              <TableRow key={release.id} hover>
                                <TableCell>{release.name}</TableCell>
                                <TableCell>{release.version}</TableCell>
                                <TableCell>
                                  <Chip label={release.release_status} size="small" />
                                </TableCell>
                                <TableCell>
                                  {release.target_date 
                                    ? dayjs(release.target_date).format('MMM D, YYYY')
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell align="right">{release.environments_count || 0}</TableCell>
                                <TableCell align="right">
                                  <Chip label={release.passed_count || 0} size="small" color="success" />
                                </TableCell>
                                <TableCell align="right">
                                  <Chip label={release.failed_count || 0} size="small" color="error" />
                                </TableCell>
                                <TableCell align="right">
                                  <Chip label={release.testing_count || 0} size="small" color="info" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary" align="center" py={4}>
                No release data available
              </Typography>
            )}
          </Box>
        )}

        {/* Resolve Conflict Dialog */}
        <Dialog
          open={resolveModal.visible}
          onClose={() => setResolveModal({ visible: false, conflict: null, notes: '' })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Resolve Conflict
            <IconButton
              onClick={() => setResolveModal({ visible: false, conflict: null, notes: '' })}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Resolution Notes (Optional)"
              value={resolveModal.notes}
              onChange={(e) => setResolveModal({ ...resolveModal, notes: e.target.value })}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResolveModal({ visible: false, conflict: null, notes: '' })}>
              Cancel
            </Button>
            <Button onClick={confirmResolve} variant="contained" color="success">
              Confirm Resolve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Booking Dialog */}
        <Dialog
          open={editBookingModal.visible}
          onClose={() => setEditBookingModal({ visible: false, booking: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Edit Booking
            <IconButton
              onClick={() => setEditBookingModal({ visible: false, booking: null })}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {editBookingModal.booking && (
              <Box sx={{ pt: 2 }}>
                <TextField
                  fullWidth
                  label="Project Name"
                  value={editBookingModal.booking.project_name || ''}
                  onChange={(e) => setEditBookingModal({
                    ...editBookingModal,
                    booking: { ...editBookingModal.booking, project_name: e.target.value }
                  })}
                  margin="normal"
                />
                <DateTimePicker
                  label="Start Time"
                  value={editBookingModal.booking.start_time}
                  onChange={(newValue) => setEditBookingModal({
                    ...editBookingModal,
                    booking: { ...editBookingModal.booking, start_time: newValue }
                  })}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                <DateTimePicker
                  label="End Time"
                  value={editBookingModal.booking.end_time}
                  onChange={(newValue) => setEditBookingModal({
                    ...editBookingModal,
                    booking: { ...editBookingModal.booking, end_time: newValue }
                  })}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={editBookingModal.booking.priority || 'medium'}
                    onChange={(e) => setEditBookingModal({
                      ...editBookingModal,
                      booking: { ...editBookingModal.booking, priority: e.target.value }
                    })}
                    label="Priority"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editBookingModal.booking.status || 'pending'}
                    onChange={(e) => setEditBookingModal({
                      ...editBookingModal,
                      booking: { ...editBookingModal.booking, status: e.target.value }
                    })}
                    label="Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditBookingModal({ visible: false, booking: null })}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBooking} variant="contained" color="primary">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
