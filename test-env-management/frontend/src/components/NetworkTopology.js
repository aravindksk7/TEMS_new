'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  CircularProgress
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Refresh,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong
} from '@mui/icons-material';
import * as d3 from 'd3';
import { componentAPI, environmentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function NetworkTopology({ user }) {
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [components, setComponents] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [componentForm, setComponentForm] = useState({
    name: '',
    type: 'service',
    version: '',
    status: 'active',
    description: ''
  });
  const [deployForm, setDeployForm] = useState({
    environment_id: '',
    component_id: '',
    port: '',
    endpoint: ''
  });
  
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    fetchData();
    // Set up interval to refresh network data every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (networkData.nodes.length > 0) {
      renderNetwork();
    }
    
    // Add window resize listener for responsive graph
    const handleResize = () => {
      if (networkData.nodes.length > 0) {
        renderNetwork();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [networkData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [topologyRes, componentsRes, environmentsRes] = await Promise.all([
        componentAPI.getNetworkTopology(),
        componentAPI.getAll({}),
        environmentAPI.getAll({})
      ]);
      
      setNetworkData(topologyRes.data);
      setComponents(componentsRes.data.components || []);
      setEnvironments(environmentsRes.data.environments || []);
    } catch (error) {
      console.error('Failed to fetch network data:', error);
      toast.error('Failed to load network topology');
    } finally {
      setLoading(false);
    }
  };

  const renderNetwork = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
      .force('link', d3.forceLink(networkData.links)
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    simulationRef.current = simulation;

    // Create arrow markers for directed links
    svg.append('defs').selectAll('marker')
      .data(['end'])
      .enter().append('marker')
      .attr('id', String)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(networkData.links)
      .enter().append('line')
      .attr('stroke', d => d.deployment_status === 'deployed' ? '#4caf50' : '#ff9800')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#end)');

    // Create node groups
    const node = g.append('g')
      .selectAll('g')
      .data(networkData.nodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.type === 'environment' ? 30 : 20)
      .attr('fill', d => {
        if (d.type === 'environment') {
          const colors = {
            'dev': '#2196f3',
            'qa': '#ff9800',
            'staging': '#9c27b0',
            'uat': '#f44336',
            'production': '#4caf50',
            'demo': '#00bcd4'
          };
          return colors[d.subtype] || '#757575';
        } else {
          const colors = {
            'application': '#3f51b5',
            'service': '#009688',
            'database': '#e91e63',
            'cache': '#ff5722',
            'queue': '#795548',
            'api': '#607d8b',
            'frontend': '#673ab7',
            'backend': '#00acc1',
            'middleware': '#8bc34a'
          };
          return colors[d.subtype] || '#9e9e9e';
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    // Add icons/text
    node.append('text')
      .text(d => d.type === 'environment' ? 'E' : 'C')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#fff')
      .attr('font-weight', 'bold')
      .attr('font-size', d => d.type === 'environment' ? '16px' : '12px')
      .style('pointer-events', 'none');

    // Add labels
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'environment' ? 45 : 35)
      .attr('fill', '#333')
      .attr('font-size', '12px')
      .style('pointer-events', 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  const handleZoomIn = () => {
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom().scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom().scaleBy, 0.7);
  };

  const handleResetView = () => {
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom().transform, d3.zoomIdentity);
  };

  const handleCreateComponent = async (e) => {
    e.preventDefault();
    try {
      await componentAPI.create(componentForm);
      toast.success('Component created successfully');
      setShowComponentModal(false);
      setComponentForm({ name: '', type: 'service', version: '', status: 'active', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create component');
    }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    try {
      await componentAPI.deploy(deployForm);
      toast.success('Component deployed successfully');
      setShowDeployModal(false);
      setDeployForm({ environment_id: '', component_id: '', port: '', endpoint: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deploy component');
    }
  };

  const handleRemoveDeployment = async (envId, compId) => {
    if (!confirm('Are you sure you want to remove this deployment?')) return;
    try {
      await componentAPI.removeDeployment(envId, compId);
      toast.success('Deployment removed successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove deployment');
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Network Topology
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowDeployModal(true)}
            sx={{ mr: 1 }}
          >
            Deploy Component
          </Button>
          <IconButton onClick={fetchData} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={9}>
          <Card sx={{ height: 'calc(100vh - 180px)' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Network Graph</Typography>
                <Box>
                  <IconButton size="small" onClick={handleZoomIn} title="Zoom In">
                    <ZoomIn />
                  </IconButton>
                  <IconButton size="small" onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOut />
                  </IconButton>
                  <IconButton size="small" onClick={handleResetView} title="Reset View">
                    <CenterFocusStrong />
                  </IconButton>
                </Box>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  flexGrow: 1,
                  minHeight: '600px',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: '#fafafa'
                }}
              >
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  style={{ display: 'block' }}
                />
              </Box>
              <Box mt={2} display="flex" gap={2} flexWrap="wrap">
                <Chip label="Environment" sx={{ bgcolor: '#2196f3', color: 'white' }} />
                <Chip label="Component" sx={{ bgcolor: '#009688', color: 'white' }} />
                <Box display="flex" alignItems="center" gap={1}>
                  <Box width={30} height={3} bgcolor="#4caf50" />
                  <Typography variant="caption">Deployed</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box width={30} height={3} bgcolor="#ff9800" />
                  <Typography variant="caption">Pending</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          {selectedNode ? (
            <Card sx={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedNode.type === 'environment' ? 'Environment' : 'Component'} Details
                </Typography>
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500} mb={2}>
                    {selectedNode.label}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Type
                  </Typography>
                  <Chip label={selectedNode.subtype} size="small" sx={{ mb: 2 }} />

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip 
                    label={selectedNode.status} 
                    size="small"
                    color={selectedNode.status === 'active' || selectedNode.status === 'available' ? 'success' : 'default'}
                    sx={{ mb: 2 }}
                  />

                  {selectedNode.version && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Version
                      </Typography>
                      <Typography variant="body1" mb={2}>
                        {selectedNode.version}
                      </Typography>
                    </>
                  )}

                  {selectedNode.url && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        URL
                      </Typography>
                      <Typography variant="body2" mb={2} sx={{ wordBreak: 'break-all' }}>
                        {selectedNode.url}
                      </Typography>
                    </>
                  )}

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setSelectedNode(null)}
                    sx={{ mt: 2 }}
                  >
                    Close
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ height: 'calc(100vh - 180px)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Box mt={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Environments
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {environments.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Components
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {components.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Connections
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {networkData.links.length}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={3}>
                  Click on a node to view details. Drag nodes to rearrange the layout.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Create Component Modal */}
      <Dialog open={showComponentModal} onClose={() => setShowComponentModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateComponent}>
          <DialogTitle>Create New Component</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Component Name"
              value={componentForm.name}
              onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
              required
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={componentForm.type}
                onChange={(e) => setComponentForm({ ...componentForm, type: e.target.value })}
                label="Type"
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
            <TextField
              fullWidth
              label="Version"
              value={componentForm.version}
              onChange={(e) => setComponentForm({ ...componentForm, version: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={componentForm.description}
              onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
              multiline
              rows={3}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowComponentModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Deploy Component Modal */}
      <Dialog open={showDeployModal} onClose={() => setShowDeployModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleDeploy}>
          <DialogTitle>Deploy Component to Environment</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Environment</InputLabel>
              <Select
                value={deployForm.environment_id}
                onChange={(e) => setDeployForm({ ...deployForm, environment_id: e.target.value })}
                label="Environment"
                required
              >
                {environments.map((env) => (
                  <MenuItem key={env.id} value={env.id}>
                    {env.name} ({env.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Component</InputLabel>
              <Select
                value={deployForm.component_id}
                onChange={(e) => setDeployForm({ ...deployForm, component_id: e.target.value })}
                label="Component"
                required
              >
                {components.map((comp) => (
                  <MenuItem key={comp.id} value={comp.id}>
                    {comp.name} ({comp.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={deployForm.port}
              onChange={(e) => setDeployForm({ ...deployForm, port: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Endpoint"
              value={deployForm.endpoint}
              onChange={(e) => setDeployForm({ ...deployForm, endpoint: e.target.value })}
              margin="normal"
              placeholder="e.g., /api/v1/service"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeployModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary">Deploy</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
