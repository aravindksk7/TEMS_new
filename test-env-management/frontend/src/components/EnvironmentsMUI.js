'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  IconButton,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Close,
  Search,
  ViewModule
} from '@mui/icons-material';
import { environmentAPI, componentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function EnvironmentsMUI({ user }) {
  const [environments, setEnvironments] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'dev',
    description: '',
    url: '',
    status: 'available'
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState(null);
  
  // Component management
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [envComponents, setEnvComponents] = useState([]);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [deployForm, setDeployForm] = useState({
    component_id: '',
    port: '',
    endpoint: '',
    customType: '',
    isCustomComponent: false
  });
  const [editingDeployment, setEditingDeployment] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [envRes, compRes] = await Promise.all([
        environmentAPI.getAll({ status: filterStatus, search: searchTerm }),
        componentAPI.getAll({})
      ]);
      setEnvironments(envRes.data.environments || []);
      setComponents(compRes.data.components || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.type) {
      toast.error('Name and type are required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingEnvId) {
        await environmentAPI.update(editingEnvId, formData);
        toast.success('Environment updated successfully');
      } else {
        await environmentAPI.create(formData);
        toast.success('Environment created successfully');
      }
      setShowModal(false);
      setEditingEnvId(null);
      setFormData({ name: '', type: 'dev', description: '', url: '', status: 'available' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save environment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (env) => {
    setEditingEnvId(env.id);
    setFormData({
      name: env.name,
      type: env.type,
      description: env.description || '',
      url: env.url || '',
      status: env.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this environment?')) return;
    try {
      await environmentAPI.delete(id);
      toast.success('Environment deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete environment');
    }
  };

  const openComponentManager = async (env) => {
    setSelectedEnv(env);
    setShowComponentModal(true);
    setDeployForm({ component_id: '', port: '', endpoint: '' });
    setEditingDeployment(null);
    await fetchEnvComponents(env.id);
  };

  const fetchEnvComponents = async (envId) => {
    try {
      const response = await componentAPI.getAll({});
      const allComponents = response.data.components || [];
      
      // Get network topology to find which components are deployed
      const topology = await componentAPI.getNetworkTopology();
      const deployed = topology.data.links
        .filter(link => link.source === `env-${envId}` || link.source.id === envId)
        .map(link => {
          const compId = parseInt(link.target.replace('comp-', ''));
          const comp = allComponents.find(c => c.id === compId);
          return {
            ...comp,
            deployment_status: link.deployment_status,
            port: link.port,
            link_id: link.id
          };
        }).filter(c => c.id);

      const available = allComponents.filter(
        comp => !deployed.find(d => d.id === comp.id)
      );

      setEnvComponents(deployed);
      setAvailableComponents(available);
    } catch (error) {
      console.error('Failed to fetch components:', error);
      toast.error('Failed to load components');
    }
  };

  const handleDeployComponent = async (e) => {
    e.preventDefault();
    if (!deployForm.component_id) {
      toast.error('Please select a component');
      return;
    }

    try {
      let componentId = deployForm.component_id;
      
      // If custom component, create it first
      if (deployForm.isCustomComponent && deployForm.component_id === 'custom') {
        if (!deployForm.customName || !deployForm.customType) {
          toast.error('Please provide component name and type');
          return;
        }
        const newComponentRes = await componentAPI.create({
          name: deployForm.customName,
          type: deployForm.customType,
          status: 'active',
          description: `Custom component for ${selectedEnv.name}`
        });
        componentId = newComponentRes.data.component.id;
      }
      
      await componentAPI.deploy({
        environment_id: selectedEnv.id,
        component_id: componentId,
        port: deployForm.port,
        endpoint: deployForm.endpoint
      });
      toast.success('Component deployed successfully');
      setDeployForm({ component_id: '', port: '', endpoint: '', customType: '', customName: '', isCustomComponent: false });
      await fetchEnvComponents(selectedEnv.id);
      fetchData(); // Refresh to update network graph
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deploy component');
    }
  };

  const handleRemoveComponent = async (componentId) => {
    if (!confirm('Remove this component from the environment?')) return;
    try {
      await componentAPI.removeDeployment(selectedEnv.id, componentId);
      toast.success('Component removed successfully');
      await fetchEnvComponents(selectedEnv.id);
      fetchData(); // Refresh to update network graph
    } catch (error) {
      toast.error('Failed to remove component');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      'in-use': 'primary',
      maintenance: 'warning',
      provisioning: 'info',
      decommissioned: 'error'
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      dev: 'info',
      qa: 'warning',
      staging: 'secondary',
      uat: 'error',
      production: 'success',
      demo: 'primary'
    };
    return colors[type] || 'default';
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
          Environments
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setShowModal(true);
            setEditingEnvId(null);
            setFormData({ name: '', type: 'dev', description: '', url: '', status: 'available' });
          }}
        >
          Add Environment
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search environments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Filter by Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="in-use">In Use</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="provisioning">Provisioning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={fetchData}
                sx={{ height: '56px' }}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {environments
          .filter(env => 
            env.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            env.description?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((env) => (
            <Grid item xs={12} md={6} lg={4} key={env.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {env.name}
                      </Typography>
                      <Box display="flex" gap={1} mb={1}>
                        <Chip label={env.type} color={getTypeColor(env.type)} size="small" />
                        <Chip label={env.status} color={getStatusColor(env.status)} size="small" />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(env)} color="primary">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(env.id)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {env.description || 'No description'}
                  </Typography>

                  {env.url && (
                    <Typography variant="caption" color="primary" display="block" mb={2} sx={{ wordBreak: 'break-all' }}>
                      {env.url}
                    </Typography>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ViewModule />}
                    onClick={() => openComponentManager(env)}
                    size="small"
                  >
                    Manage Components
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* Create/Edit Environment Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateOrUpdate}>
          <DialogTitle>
            {editingEnvId ? 'Edit Environment' : 'Create Environment'}
            <IconButton
              onClick={() => setShowModal(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Environment Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Type"
              >
                <MenuItem value="dev">Development</MenuItem>
                <MenuItem value="qa">QA</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
                <MenuItem value="uat">UAT</MenuItem>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="demo">Demo</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="in-use">In Use</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="provisioning">Provisioning</MenuItem>
                <MenuItem value="decommissioned">Decommissioned</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : editingEnvId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Component Management Modal */}
      <Dialog open={showComponentModal} onClose={() => setShowComponentModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Components - {selectedEnv?.name}
          <IconButton
            onClick={() => setShowComponentModal(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Deploy New Component
            </Typography>
            <form onSubmit={handleDeployComponent}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Component</InputLabel>
                    <Select
                      value={deployForm.component_id}
                      onChange={(e) => {
                        const isCustom = e.target.value === 'custom';
                        setDeployForm({ 
                          ...deployForm, 
                          component_id: e.target.value,
                          isCustomComponent: isCustom
                        });
                      }}
                      label="Component"
                      required
                    >
                      {availableComponents.map((comp) => (
                        <MenuItem key={comp.id} value={comp.id}>
                          {comp.name} ({comp.type})
                        </MenuItem>
                      ))}
                      <MenuItem value="custom">+ Add Custom Component</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Port"
                    type="number"
                    value={deployForm.port}
                    onChange={(e) => setDeployForm({ ...deployForm, port: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    sx={{ height: '56px' }}
                  >
                    Deploy
                  </Button>
                </Grid>
              </Grid>
              {deployForm.isCustomComponent && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Custom Component Name"
                      value={deployForm.customName || ''}
                      onChange={(e) => setDeployForm({ ...deployForm, customName: e.target.value })}
                      required
                      placeholder="e.g., Redis Cache"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Component Type</InputLabel>
                      <Select
                        value={deployForm.customType}
                        onChange={(e) => setDeployForm({ ...deployForm, customType: e.target.value })}
                        label="Component Type"
                        required
                      >
                        <MenuItem value="application">Application</MenuItem>
                        <MenuItem value="service">Service</MenuItem>
                        <MenuItem value="database">Database</MenuItem>
                        <MenuItem value="cache">Cache</MenuItem>
                        <MenuItem value="queue">Queue</MenuItem>
                        <MenuItem value="api">API</MenuItem>
                        <MenuItem value="frontend">Frontend</MenuItem>
                        <MenuItem value="backend">Backend</MenuItem>
                        <MenuItem value="middleware">Middleware</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}
              <TextField
                fullWidth
                label="Endpoint"
                value={deployForm.endpoint}
                onChange={(e) => setDeployForm({ ...deployForm, endpoint: e.target.value })}
                margin="normal"
                placeholder="/api/v1/service"
              />
            </form>
          </Box>

          <Typography variant="h6" gutterBottom>
            Deployed Components
          </Typography>
          {envComponents.length === 0 ? (
            <Typography color="text.secondary" align="center" py={3}>
              No components deployed
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {envComponents.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>{comp.name}</TableCell>
                      <TableCell>
                        <Chip label={comp.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{comp.port || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={comp.deployment_status} 
                          size="small" 
                          color={comp.deployment_status === 'deployed' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveComponent(comp.id)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowComponentModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
