'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Link as LinkIcon,
  SwapHoriz,
  Assessment,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Refresh,
  History,
  OpenInNew,
  PlayArrow,
  Timeline
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function DeploymentTrackingMUI({ user }) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Deployment Status State
  const [deployments, setDeployments] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [releases, setReleases] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [selectedRelease, setSelectedRelease] = useState('');

  // Jira Deployment Dialog
  const [showJiraDeployDialog, setShowJiraDeployDialog] = useState(false);
  const [jiraDeployForm, setJiraDeployForm] = useState({
    environment_id: '',
    release_id: '',
    deployment_status: 'deployed',
    issue_keys: ''
  });

  // Link Jira-GitLab Dialog
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkForm, setLinkForm] = useState({
    issue_key: '',
    project_id: '',
    merge_request_iid: ''
  });

  // Transition Dialog
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [transitionForm, setTransitionForm] = useState({
    issue_key: '',
    transition_name: '',
    comment: ''
  });

  // Report State
  const [reportData, setReportData] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    start_date: '',
    end_date: '',
    environment_type: ''
  });

  useEffect(() => {
    loadEnvironments();
    loadReleases();
    loadDeploymentStatus();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const loadEnvironments = async () => {
    try {
      const response = await axios.get(`${API_URL}/environments`, getAuthHeaders());
      setEnvironments(response.data.environments || []);
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const loadReleases = async () => {
    try {
      const response = await axios.get(`${API_URL}/releases`, getAuthHeaders());
      setReleases(response.data.releases || []);
    } catch (error) {
      console.error('Failed to load releases:', error);
    }
  };

  const loadDeploymentStatus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEnvironment) params.append('environment_id', selectedEnvironment);
      if (selectedRelease) params.append('release_id', selectedRelease);

      const response = await axios.get(
        `${API_URL}/deployment-tracking/deployment-status?${params.toString()}`,
        getAuthHeaders()
      );
      setDeployments(response.data.deployments || []);
    } catch (error) {
      toast.error('Failed to load deployment status');
    } finally {
      setLoading(false);
    }
  };

  const sendDeploymentToJira = async () => {
    setLoading(true);
    try {
      // Get Jira settings
      const settingsResponse = await axios.get(
        `${API_URL}/integrations/settings?integration_type=jira`,
        getAuthHeaders()
      );

      if (!settingsResponse.data.settings) {
        toast.error('Please configure Jira integration first');
        return;
      }

      const jiraSettings = settingsResponse.data.settings;
      const issueKeysArray = jiraDeployForm.issue_keys.split(',').map(k => k.trim());

      await axios.post(
        `${API_URL}/deployment-tracking/jira/deployment`,
        {
          ...jiraDeployForm,
          issue_keys: issueKeysArray,
          ...jiraSettings
        },
        getAuthHeaders()
      );

      toast.success('Deployment tracked in Jira successfully');
      setShowJiraDeployDialog(false);
      setJiraDeployForm({
        environment_id: '',
        release_id: '',
        deployment_status: 'deployed',
        issue_keys: ''
      });
      loadDeploymentStatus();
    } catch (error) {
      toast.error(error.response?.data?.details || 'Failed to send deployment to Jira');
    } finally {
      setLoading(false);
    }
  };

  const linkJiraToGitLab = async () => {
    setLoading(true);
    try {
      // Get integration settings
      const jiraResponse = await axios.get(
        `${API_URL}/integrations/settings?integration_type=jira`,
        getAuthHeaders()
      );
      const gitlabResponse = await axios.get(
        `${API_URL}/integrations/settings?integration_type=gitlab`,
        getAuthHeaders()
      );

      if (!jiraResponse.data.settings || !gitlabResponse.data.settings) {
        toast.error('Please configure both Jira and GitLab integrations first');
        return;
      }

      await axios.post(
        `${API_URL}/deployment-tracking/link-jira-gitlab`,
        {
          ...linkForm,
          ...jiraResponse.data.settings,
          ...gitlabResponse.data.settings
        },
        getAuthHeaders()
      );

      toast.success('Jira issue linked to GitLab MR successfully');
      setShowLinkDialog(false);
      setLinkForm({ issue_key: '', project_id: '', merge_request_iid: '' });
    } catch (error) {
      toast.error(error.response?.data?.details || 'Failed to link Jira to GitLab');
    } finally {
      setLoading(false);
    }
  };

  const transitionJiraIssue = async () => {
    setLoading(true);
    try {
      const jiraResponse = await axios.get(
        `${API_URL}/integrations/settings?integration_type=jira`,
        getAuthHeaders()
      );

      if (!jiraResponse.data.settings) {
        toast.error('Please configure Jira integration first');
        return;
      }

      await axios.post(
        `${API_URL}/deployment-tracking/jira/transition`,
        {
          ...transitionForm,
          ...jiraResponse.data.settings
        },
        getAuthHeaders()
      );

      toast.success('Jira issue transitioned successfully');
      setShowTransitionDialog(false);
      setTransitionForm({ issue_key: '', transition_name: '', comment: '' });
    } catch (error) {
      toast.error(error.response?.data?.details || 'Failed to transition Jira issue');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.start_date) params.append('start_date', reportFilters.start_date);
      if (reportFilters.end_date) params.append('end_date', reportFilters.end_date);
      if (reportFilters.environment_type) params.append('environment_type', reportFilters.environment_type);

      const response = await axios.get(
        `${API_URL}/deployment-tracking/deployment-report?${params.toString()}`,
        getAuthHeaders()
      );
      setReportData(response.data);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'successful':
      case 'deployed':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'successful':
      case 'deployed':
        return <CheckCircle />;
      case 'failed':
        return <ErrorIcon />;
      case 'pending':
        return <Pending />;
      default:
        return <History />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Deployment Tracking & Visibility
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Automated deployment tracking, Jira-GitLab integration, and comprehensive reporting
          </Typography>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<Timeline />} label="Deployment Status" iconPosition="start" />
        <Tab icon={<CloudUpload />} label="Track to Jira" iconPosition="start" />
        <Tab icon={<LinkIcon />} label="Link Jira-GitLab" iconPosition="start" />
        <Tab icon={<SwapHoriz />} label="Auto Transitions" iconPosition="start" />
        <Tab icon={<Assessment />} label="Reports" iconPosition="start" />
      </Tabs>

      {/* Tab 0: Deployment Status */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">Current Deployment Status</Typography>
                  <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Environment</InputLabel>
                      <Select
                        value={selectedEnvironment}
                        onChange={(e) => setSelectedEnvironment(e.target.value)}
                        label="Environment"
                      >
                        <MenuItem value="">All Environments</MenuItem>
                        {environments.map(env => (
                          <MenuItem key={env.id} value={env.id}>{env.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Release</InputLabel>
                      <Select
                        value={selectedRelease}
                        onChange={(e) => setSelectedRelease(e.target.value)}
                        label="Release"
                      >
                        <MenuItem value="">All Releases</MenuItem>
                        {releases.map(rel => (
                          <MenuItem key={rel.id} value={rel.id}>{rel.name} v{rel.version}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton onClick={loadDeploymentStatus} disabled={loading}>
                      <Refresh />
                    </IconButton>
                  </Box>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : deployments.length === 0 ? (
                  <Alert severity="info">No deployments found. Apply filters or deploy releases to environments.</Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Environment</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Release</TableCell>
                          <TableCell>Version</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Deployed By</TableCell>
                          <TableCell>Deployed At</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deployments.map((deployment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {deployment.environment.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={deployment.environment.type} size="small" />
                            </TableCell>
                            <TableCell>{deployment.release.name}</TableCell>
                            <TableCell>
                              <Chip label={`v${deployment.release.version}`} size="small" color="primary" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(deployment.deployment.status)}
                                label={deployment.deployment.status}
                                size="small"
                                color={getStatusColor(deployment.deployment.status)}
                              />
                            </TableCell>
                            <TableCell>{deployment.deployment.deployed_by.name || 'System'}</TableCell>
                            <TableCell>
                              {deployment.deployment.deployed_at 
                                ? format(new Date(deployment.deployment.deployed_at), 'MMM d, yyyy HH:mm')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Track Deployment to Jira */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <CloudUpload color="primary" />
                  <Typography variant="h6">Send Deployment to Jira</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Automatically track deployment information in Jira issues using the Deployment API
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setShowJiraDeployDialog(true)}
                  size="large"
                >
                  Track Deployment
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Benefits</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Real-time Visibility"
                      secondary="Testers see which versions are deployed to each environment"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Eliminate Guesswork"
                      secondary="No more asking 'Is feature X in QA yet?'"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Full Traceability"
                      secondary="Track deployments from planning to production"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Automated Updates"
                      secondary="CI/CD pipelines can auto-update Jira"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Link Jira to GitLab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <LinkIcon color="primary" />
                  <Typography variant="h6">Link Jira Issues to GitLab MRs</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Create bidirectional links between Jira issues and GitLab merge requests for full traceability
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={() => setShowLinkDialog(true)}
                  size="large"
                >
                  Create Link
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Link Features</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Requirements to Code"
                      secondary="Direct link from bug report to actual code changes"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Smart Commit Messages"
                      secondary="Reference Jira IDs in commits (e.g., 'PROJ-123 Fix login bug')"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="MR Status in Jira"
                      secondary="See merge request status directly in Jira issues"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Audit Trail"
                      secondary="Complete history of changes and deployments"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Automated Transitions */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <SwapHoriz color="primary" />
                  <Typography variant="h6">Automate Issue Transitions</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Automatically move issues through workflow states based on deployment events
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => setShowTransitionDialog(true)}
                  size="large"
                >
                  Transition Issue
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Automation Examples</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="MR Merged → Ready for Testing"
                      secondary="Auto-transition when code is merged to main branch"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Deployed to QA → In Testing"
                      secondary="Move issue when deployed to QA environment"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Deployed to Prod → Done"
                      secondary="Close issue when released to production"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Pipeline Failed → Needs Review"
                      secondary="Flag issues when CI/CD pipeline fails"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Reports */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={3}>Deployment Report</Typography>
                <Grid container spacing={2} mb={3}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Start Date"
                      value={reportFilters.start_date}
                      onChange={(e) => setReportFilters({ ...reportFilters, start_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="date"
                      label="End Date"
                      value={reportFilters.end_date}
                      onChange={(e) => setReportFilters({ ...reportFilters, end_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Environment Type</InputLabel>
                      <Select
                        value={reportFilters.environment_type}
                        onChange={(e) => setReportFilters({ ...reportFilters, environment_type: e.target.value })}
                        label="Environment Type"
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <MenuItem value="dev">Development</MenuItem>
                        <MenuItem value="qa">QA</MenuItem>
                        <MenuItem value="staging">Staging</MenuItem>
                        <MenuItem value="uat">UAT</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={generateReport}
                      disabled={loading}
                      size="large"
                    >
                      Generate Report
                    </Button>
                  </Grid>
                </Grid>

                {reportData && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Grid container spacing={3} mb={3}>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {reportData.summary.total_deployments}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Deployments
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {reportData.summary.successful_deployments}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Successful
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="error.main">
                            {reportData.summary.failed_deployments}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Failed
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {reportData.summary.success_rate}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Success Rate
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Environment Type</TableCell>
                            <TableCell align="center">Total</TableCell>
                            <TableCell align="center">Successful</TableCell>
                            <TableCell align="center">Failed</TableCell>
                            <TableCell align="center">Pending</TableCell>
                            <TableCell>Releases</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportData.daily_report.map((day, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{format(new Date(day.deployment_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell><Chip label={day.environment_type} size="small" /></TableCell>
                              <TableCell align="center">{day.total_deployments}</TableCell>
                              <TableCell align="center">
                                <Chip label={day.successful} size="small" color="success" />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={day.failed} size="small" color="error" />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={day.pending} size="small" color="warning" />
                              </TableCell>
                              <TableCell>
                                <Tooltip title={day.releases}>
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                    {day.releases}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Jira Deployment Dialog */}
      <Dialog open={showJiraDeployDialog} onClose={() => setShowJiraDeployDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Track Deployment in Jira</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Environment</InputLabel>
            <Select
              value={jiraDeployForm.environment_id}
              onChange={(e) => setJiraDeployForm({ ...jiraDeployForm, environment_id: e.target.value })}
              label="Environment"
            >
              {environments.map(env => (
                <MenuItem key={env.id} value={env.id}>{env.name} ({env.type})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Release</InputLabel>
            <Select
              value={jiraDeployForm.release_id}
              onChange={(e) => setJiraDeployForm({ ...jiraDeployForm, release_id: e.target.value })}
              label="Release"
            >
              {releases.map(rel => (
                <MenuItem key={rel.id} value={rel.id}>{rel.name} v{rel.version}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={jiraDeployForm.deployment_status}
              onChange={(e) => setJiraDeployForm({ ...jiraDeployForm, deployment_status: e.target.value })}
              label="Status"
            >
              <MenuItem value="deployed">Deployed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Jira Issue Keys (comma-separated)"
            placeholder="PROJ-123, PROJ-456"
            value={jiraDeployForm.issue_keys}
            onChange={(e) => setJiraDeployForm({ ...jiraDeployForm, issue_keys: e.target.value })}
            margin="normal"
            helperText="Issues will be updated with deployment information"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJiraDeployDialog(false)}>Cancel</Button>
          <Button
            onClick={sendDeploymentToJira}
            variant="contained"
            disabled={loading || !jiraDeployForm.environment_id || !jiraDeployForm.release_id || !jiraDeployForm.issue_keys}
          >
            Send to Jira
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Jira-GitLab Dialog */}
      <Dialog open={showLinkDialog} onClose={() => setShowLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Link Jira Issue to GitLab MR</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Jira Issue Key"
            placeholder="PROJ-123"
            value={linkForm.issue_key}
            onChange={(e) => setLinkForm({ ...linkForm, issue_key: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="GitLab Project ID"
            placeholder="12345"
            value={linkForm.project_id}
            onChange={(e) => setLinkForm({ ...linkForm, project_id: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Merge Request IID"
            placeholder="42"
            value={linkForm.merge_request_iid}
            onChange={(e) => setLinkForm({ ...linkForm, merge_request_iid: e.target.value })}
            margin="normal"
            helperText="The MR number (e.g., !42)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLinkDialog(false)}>Cancel</Button>
          <Button
            onClick={linkJiraToGitLab}
            variant="contained"
            disabled={loading || !linkForm.issue_key || !linkForm.project_id || !linkForm.merge_request_iid}
          >
            Create Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog open={showTransitionDialog} onClose={() => setShowTransitionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transition Jira Issue</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Jira Issue Key"
            placeholder="PROJ-123"
            value={transitionForm.issue_key}
            onChange={(e) => setTransitionForm({ ...transitionForm, issue_key: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Transition To</InputLabel>
            <Select
              value={transitionForm.transition_name}
              onChange={(e) => setTransitionForm({ ...transitionForm, transition_name: e.target.value })}
              label="Transition To"
            >
              <MenuItem value="Ready for Testing">Ready for Testing</MenuItem>
              <MenuItem value="In Testing">In Testing</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Comment (optional)"
            multiline
            rows={3}
            value={transitionForm.comment}
            onChange={(e) => setTransitionForm({ ...transitionForm, comment: e.target.value })}
            margin="normal"
            placeholder="Add a comment explaining the transition"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransitionDialog(false)}>Cancel</Button>
          <Button
            onClick={transitionJiraIssue}
            variant="contained"
            disabled={loading || !transitionForm.issue_key || !transitionForm.transition_name}
          >
            Transition Issue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
