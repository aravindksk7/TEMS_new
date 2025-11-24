'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Close
} from '@mui/icons-material';
import { releaseAPI, environmentAPI, componentAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function ReleasesMUI({ user }) {
  const [releases, setReleases] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [releaseDetails, setReleaseDetails] = useState(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  
  const [releaseForm, setReleaseForm] = useState({
    name: '',
    version: '',
    release_type: 'minor',
    status: 'planned',
    description: '',
    target_date: ''
  });

  const [envForm, setEnvForm] = useState({
    environment_id: '',
    test_phase: 'integration',
    use_case: '',
    test_start_date: '',
    assigned_to: user?.id || ''
  });

  const [compForm, setCompForm] = useState({
    component_id: '',
    version: '',
    change_type: 'modified',
    change_description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [releasesRes, envsRes, compsRes] = await Promise.all([
        releaseAPI.getAll({}),
        environmentAPI.getAll({}),
        componentAPI.getAll({})
      ]);
      setReleases(releasesRes.data.releases || []);
      setEnvironments(envsRes.data.environments || []);
      setComponents(compsRes.data.components || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    try {
      await releaseAPI.create(releaseForm);
      toast.success('Release created successfully');
      setShowReleaseModal(false);
      setReleaseForm({ name: '', version: '', release_type: 'minor', status: 'planned', description: '', target_date: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create release');
    }
  };

  const handleViewDetails = async (release) => {
    try {
      const res = await releaseAPI.getById(release.id);
      setReleaseDetails(res.data);
      setSelectedRelease(release);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load release details');
    }
  };

  const handleAssociateEnvironment = async (e) => {
    e.preventDefault();
    try {
      await releaseAPI.associateEnvironment({
        release_id: selectedRelease.id,
        ...envForm
      });
      toast.success('Environment associated successfully');
      setShowEnvModal(false);
      setEnvForm({ environment_id: '', test_phase: 'integration', use_case: '', test_start_date: '', assigned_to: user?.id || '' });
      handleViewDetails(selectedRelease);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to associate environment');
    }
  };

  const handleAssociateComponent = async (e) => {
    e.preventDefault();
    try {
      await releaseAPI.associateComponent({
        release_id: selectedRelease.id,
        ...compForm
      });
      toast.success('Component associated successfully');
      setShowCompModal(false);
      setCompForm({ component_id: '', version: '', change_type: 'modified', change_description: '' });
      handleViewDetails(selectedRelease);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to associate component');
    }
  };

  const handleDeleteRelease = async (id) => {
    if (!confirm('Are you sure you want to delete this release?')) return;
    try {
      await releaseAPI.delete(id);
      toast.success('Release deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete release');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'planned': 'default',
      'in-progress': 'info',
      'testing': 'warning',
      'ready': 'success',
      'deployed': 'primary',
      'completed': 'success',
      'cancelled': 'error'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Releases
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowReleaseModal(true)}
        >
          Create Release
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Target Date</TableCell>
                  <TableCell>Environments</TableCell>
                  <TableCell>Components</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id} hover>
                    <TableCell>{release.name}</TableCell>
                    <TableCell>{release.version}</TableCell>
                    <TableCell>
                      <Chip label={release.release_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={release.status} size="small" color={getStatusColor(release.status)} />
                    </TableCell>
                    <TableCell>
                      {release.target_date ? dayjs(release.target_date).format('MMM D, YYYY') : '-'}
                    </TableCell>
                    <TableCell>{release.environment_count || 0}</TableCell>
                    <TableCell>{release.component_count || 0}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewDetails(release)} color="primary">
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteRelease(release.id)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Release Modal */}
      <Dialog open={showReleaseModal} onClose={() => setShowReleaseModal(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleCreateRelease}>
          <DialogTitle>Create New Release</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Release Name"
                  value={releaseForm.name}
                  onChange={(e) => setReleaseForm({ ...releaseForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Version"
                  value={releaseForm.version}
                  onChange={(e) => setReleaseForm({ ...releaseForm, version: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={releaseForm.release_type}
                    onChange={(e) => setReleaseForm({ ...releaseForm, release_type: e.target.value })}
                    label="Type"
                  >
                    <MenuItem value="major">Major</MenuItem>
                    <MenuItem value="minor">Minor</MenuItem>
                    <MenuItem value="patch">Patch</MenuItem>
                    <MenuItem value="hotfix">Hotfix</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={releaseForm.status}
                    onChange={(e) => setReleaseForm({ ...releaseForm, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="testing">Testing</MenuItem>
                    <MenuItem value="ready">Ready</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Target Date"
                  type="date"
                  value={releaseForm.target_date}
                  onChange={(e) => setReleaseForm({ ...releaseForm, target_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={releaseForm.description}
                  onChange={(e) => setReleaseForm({ ...releaseForm, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowReleaseModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Release Details Modal */}
      <Dialog open={showDetailsModal} onClose={() => setShowDetailsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {releaseDetails?.release.name} v{releaseDetails?.release.version}
          <IconButton
            onClick={() => setShowDetailsModal(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {releaseDetails && (
            <Box>
              <Paper sx={{ mb: 2 }}>
                <Tabs value={detailsTab} onChange={(e, v) => setDetailsTab(v)}>
                  <Tab label="Overview" />
                  <Tab label={`Environments (${releaseDetails.environments.length})`} />
                  <Tab label={`Components (${releaseDetails.components.length})`} />
                </Tabs>
              </Paper>

              {detailsTab === 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Description</Typography>
                  <Typography variant="body1" mb={2}>{releaseDetails.release.description || 'No description'}</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Chip label={releaseDetails.release.status} color={getStatusColor(releaseDetails.release.status)} size="small" />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Type</Typography>
                      <Chip label={releaseDetails.release.release_type} size="small" variant="outlined" />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {detailsTab === 1 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Test Environments</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setShowEnvModal(true)}
                    >
                      Add Environment
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Environment</TableCell>
                          <TableCell>Test Phase</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Use Case</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {releaseDetails.environments.map((env) => (
                          <TableRow key={env.id}>
                            <TableCell>{env.environment_name}</TableCell>
                            <TableCell>{env.test_phase}</TableCell>
                            <TableCell><Chip label={env.status} size="small" /></TableCell>
                            <TableCell>{env.use_case || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {detailsTab === 2 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Components</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setShowCompModal(true)}
                    >
                      Add Component
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Component</TableCell>
                          <TableCell>Version</TableCell>
                          <TableCell>Change Type</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {releaseDetails.components.map((comp) => (
                          <TableRow key={comp.id}>
                            <TableCell>{comp.component_name}</TableCell>
                            <TableCell>{comp.version}</TableCell>
                            <TableCell><Chip label={comp.change_type} size="small" /></TableCell>
                            <TableCell>{comp.change_description || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Associate Environment Modal */}
      <Dialog open={showEnvModal} onClose={() => setShowEnvModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAssociateEnvironment}>
          <DialogTitle>Associate Environment</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Environment</InputLabel>
              <Select
                value={envForm.environment_id}
                onChange={(e) => setEnvForm({ ...envForm, environment_id: e.target.value })}
                label="Environment"
                required
              >
                {environments.map((env) => (
                  <MenuItem key={env.id} value={env.id}>{env.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Test Phase</InputLabel>
              <Select
                value={envForm.test_phase}
                onChange={(e) => setEnvForm({ ...envForm, test_phase: e.target.value })}
                label="Test Phase"
              >
                <MenuItem value="unit">Unit Testing</MenuItem>
                <MenuItem value="integration">Integration Testing</MenuItem>
                <MenuItem value="system">System Testing</MenuItem>
                <MenuItem value="uat">UAT</MenuItem>
                <MenuItem value="regression">Regression Testing</MenuItem>
                <MenuItem value="performance">Performance Testing</MenuItem>
                <MenuItem value="security">Security Testing</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Use Case"
              value={envForm.use_case}
              onChange={(e) => setEnvForm({ ...envForm, use_case: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Test Start Date"
              type="datetime-local"
              value={envForm.test_start_date}
              onChange={(e) => setEnvForm({ ...envForm, test_start_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEnvModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Associate</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Associate Component Modal */}
      <Dialog open={showCompModal} onClose={() => setShowCompModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAssociateComponent}>
          <DialogTitle>Associate Component</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Component</InputLabel>
              <Select
                value={compForm.component_id}
                onChange={(e) => setCompForm({ ...compForm, component_id: e.target.value })}
                label="Component"
                required
              >
                {components.map((comp) => (
                  <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Version"
              value={compForm.version}
              onChange={(e) => setCompForm({ ...compForm, version: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Change Type</InputLabel>
              <Select
                value={compForm.change_type}
                onChange={(e) => setCompForm({ ...compForm, change_type: e.target.value })}
                label="Change Type"
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="modified">Modified</MenuItem>
                <MenuItem value="deprecated">Deprecated</MenuItem>
                <MenuItem value="removed">Removed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Change Description"
              value={compForm.change_description}
              onChange={(e) => setCompForm({ ...compForm, change_description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCompModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Associate</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
