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
  InputLabel
} from '@mui/material';
import {
  Settings,
  Check,
  Error as ErrorIcon,
  Refresh,
  Add,
  OpenInNew
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function IntegrationsMUI({ user }) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Jira State
  const [jiraSettings, setJiraSettings] = useState({
    jira_url: '',
    jira_email: '',
    jira_token: '',
    project_key: ''
  });
  const [jiraConnected, setJiraConnected] = useState(false);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [showJiraIssueDialog, setShowJiraIssueDialog] = useState(false);
  const [jiraIssueForm, setJiraIssueForm] = useState({
    summary: '',
    description: '',
    issue_type: 'Task'
  });

  // GitLab State
  const [gitlabSettings, setGitlabSettings] = useState({
    gitlab_url: '',
    gitlab_token: '',
    project_id: ''
  });
  const [gitlabConnected, setGitlabConnected] = useState(false);
  const [gitlabProjects, setGitlabProjects] = useState([]);
  const [gitlabIssues, setGitlabIssues] = useState([]);
  const [showGitlabIssueDialog, setShowGitlabIssueDialog] = useState(false);
  const [gitlabIssueForm, setGitlabIssueForm] = useState({
    title: '',
    description: '',
    labels: ''
  });

  useEffect(() => {
    loadIntegrationSettings();
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

  const loadIntegrationSettings = async () => {
    try {
      // Load Jira settings
      const jiraRes = await axios.get(
        `${API_URL}/integrations/settings?integration_type=jira`,
        getAuthHeaders()
      );
      if (jiraRes.data.settings) {
        setJiraSettings(jiraRes.data.settings);
        setJiraConnected(true);
      }

      // Load GitLab settings
      const gitlabRes = await axios.get(
        `${API_URL}/integrations/settings?integration_type=gitlab`,
        getAuthHeaders()
      );
      if (gitlabRes.data.settings) {
        setGitlabSettings(gitlabRes.data.settings);
        setGitlabConnected(true);
      }
    } catch (error) {
      console.error('Failed to load integration settings:', error);
    }
  };

  // Jira Functions
  const testJiraConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/integrations/jira/test`,
        jiraSettings,
        getAuthHeaders()
      );
      setJiraConnected(true);
      toast.success(`Connected to Jira as ${response.data.user.name}`);
      await saveJiraSettings();
    } catch (error) {
      setJiraConnected(false);
      toast.error(error.response?.data?.details || 'Failed to connect to Jira');
    } finally {
      setLoading(false);
    }
  };

  const saveJiraSettings = async () => {
    try {
      await axios.post(
        `${API_URL}/integrations/settings`,
        { integration_type: 'jira', settings: jiraSettings },
        getAuthHeaders()
      );
      toast.success('Jira settings saved');
    } catch (error) {
      toast.error('Failed to save Jira settings');
    }
  };

  const fetchJiraIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(jiraSettings).toString();
      const response = await axios.get(
        `${API_URL}/integrations/jira/issues?${params}`,
        getAuthHeaders()
      );
      setJiraIssues(response.data.issues);
    } catch (error) {
      toast.error('Failed to fetch Jira issues');
    } finally {
      setLoading(false);
    }
  };

  const createJiraIssue = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/integrations/jira/issues`,
        { ...jiraSettings, ...jiraIssueForm },
        getAuthHeaders()
      );
      toast.success(`Jira issue ${response.data.issue_key} created`);
      setShowJiraIssueDialog(false);
      setJiraIssueForm({ summary: '', description: '', issue_type: 'Task' });
      fetchJiraIssues();
    } catch (error) {
      toast.error(error.response?.data?.details || 'Failed to create Jira issue');
    } finally {
      setLoading(false);
    }
  };

  // GitLab Functions
  const testGitlabConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/integrations/gitlab/test`,
        gitlabSettings,
        getAuthHeaders()
      );
      setGitlabConnected(true);
      toast.success(`Connected to GitLab as ${response.data.user.name}`);
      await saveGitlabSettings();
      fetchGitlabProjects();
    } catch (error) {
      setGitlabConnected(false);
      toast.error(error.response?.data?.details || 'Failed to connect to GitLab');
    } finally {
      setLoading(false);
    }
  };

  const saveGitlabSettings = async () => {
    try {
      await axios.post(
        `${API_URL}/integrations/settings`,
        { integration_type: 'gitlab', settings: gitlabSettings },
        getAuthHeaders()
      );
      toast.success('GitLab settings saved');
    } catch (error) {
      toast.error('Failed to save GitLab settings');
    }
  };

  const fetchGitlabProjects = async () => {
    try {
      const params = new URLSearchParams({
        gitlab_url: gitlabSettings.gitlab_url,
        gitlab_token: gitlabSettings.gitlab_token
      }).toString();
      const response = await axios.get(
        `${API_URL}/integrations/gitlab/projects?${params}`,
        getAuthHeaders()
      );
      setGitlabProjects(response.data.projects);
    } catch (error) {
      toast.error('Failed to fetch GitLab projects');
    }
  };

  const fetchGitlabIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(gitlabSettings).toString();
      const response = await axios.get(
        `${API_URL}/integrations/gitlab/issues?${params}`,
        getAuthHeaders()
      );
      setGitlabIssues(response.data.issues);
    } catch (error) {
      toast.error('Failed to fetch GitLab issues');
    } finally {
      setLoading(false);
    }
  };

  const createGitlabIssue = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/integrations/gitlab/issues`,
        { ...gitlabSettings, ...gitlabIssueForm },
        getAuthHeaders()
      );
      toast.success(`GitLab issue #${response.data.issue_iid} created`);
      setShowGitlabIssueDialog(false);
      setGitlabIssueForm({ title: '', description: '', labels: '' });
      fetchGitlabIssues();
    } catch (error) {
      toast.error(error.response?.data?.details || 'Failed to create GitLab issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Integrations
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Jira Cloud" />
        <Tab label="GitLab" />
      </Tabs>

      {/* Jira Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Settings color="primary" />
                  <Typography variant="h6">Jira Configuration</Typography>
                </Box>
                
                {jiraConnected && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Check /> Connected to Jira
                    </Box>
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Jira URL"
                  placeholder="https://your-domain.atlassian.net"
                  value={jiraSettings.jira_url}
                  onChange={(e) => setJiraSettings({ ...jiraSettings, jira_url: e.target.value })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={jiraSettings.jira_email}
                  onChange={(e) => setJiraSettings({ ...jiraSettings, jira_email: e.target.value })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="API Token"
                  type="password"
                  value={jiraSettings.jira_token}
                  onChange={(e) => setJiraSettings({ ...jiraSettings, jira_token: e.target.value })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Project Key"
                  placeholder="PROJ"
                  value={jiraSettings.project_key}
                  onChange={(e) => setJiraSettings({ ...jiraSettings, project_key: e.target.value })}
                  margin="normal"
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={testJiraConnection}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Test & Save Connection'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Jira Issues</Typography>
                  <Box>
                    <Button
                      startIcon={<Add />}
                      variant="contained"
                      onClick={() => setShowJiraIssueDialog(true)}
                      disabled={!jiraConnected}
                      sx={{ mr: 1 }}
                    >
                      Create Issue
                    </Button>
                    <IconButton onClick={fetchJiraIssues} disabled={!jiraConnected || loading}>
                      <Refresh />
                    </IconButton>
                  </Box>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : jiraIssues.length === 0 ? (
                  <Alert severity="info">No issues found. Click Refresh to load issues.</Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Key</TableCell>
                          <TableCell>Summary</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {jiraIssues.map((issue) => (
                          <TableRow key={issue.key}>
                            <TableCell>{issue.key}</TableCell>
                            <TableCell>{issue.summary}</TableCell>
                            <TableCell><Chip label={issue.type} size="small" /></TableCell>
                            <TableCell><Chip label={issue.status} size="small" color="primary" /></TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => window.open(issue.url, '_blank')}
                              >
                                <OpenInNew />
                              </IconButton>
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

      {/* GitLab Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Settings color="primary" />
                  <Typography variant="h6">GitLab Configuration</Typography>
                </Box>
                
                {gitlabConnected && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Check /> Connected to GitLab
                    </Box>
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="GitLab URL"
                  placeholder="https://gitlab.com"
                  value={gitlabSettings.gitlab_url}
                  onChange={(e) => setGitlabSettings({ ...gitlabSettings, gitlab_url: e.target.value })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Personal Access Token"
                  type="password"
                  value={gitlabSettings.gitlab_token}
                  onChange={(e) => setGitlabSettings({ ...gitlabSettings, gitlab_token: e.target.value })}
                  margin="normal"
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={gitlabSettings.project_id}
                    onChange={(e) => setGitlabSettings({ ...gitlabSettings, project_id: e.target.value })}
                    label="Project"
                    disabled={!gitlabConnected}
                  >
                    {gitlabProjects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.path}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={testGitlabConnection}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Test & Save Connection'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">GitLab Issues</Typography>
                  <Box>
                    <Button
                      startIcon={<Add />}
                      variant="contained"
                      onClick={() => setShowGitlabIssueDialog(true)}
                      disabled={!gitlabConnected || !gitlabSettings.project_id}
                      sx={{ mr: 1 }}
                    >
                      Create Issue
                    </Button>
                    <IconButton 
                      onClick={fetchGitlabIssues} 
                      disabled={!gitlabConnected || !gitlabSettings.project_id || loading}
                    >
                      <Refresh />
                    </IconButton>
                  </Box>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : gitlabIssues.length === 0 ? (
                  <Alert severity="info">No issues found. Click Refresh to load issues.</Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>State</TableCell>
                          <TableCell>Labels</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gitlabIssues.map((issue) => (
                          <TableRow key={issue.iid}>
                            <TableCell>#{issue.iid}</TableCell>
                            <TableCell>{issue.title}</TableCell>
                            <TableCell>
                              <Chip 
                                label={issue.state} 
                                size="small" 
                                color={issue.state === 'opened' ? 'success' : 'default'} 
                              />
                            </TableCell>
                            <TableCell>
                              {issue.labels.map((label, i) => (
                                <Chip key={i} label={label} size="small" sx={{ mr: 0.5 }} />
                              ))}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => window.open(issue.url, '_blank')}
                              >
                                <OpenInNew />
                              </IconButton>
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

      {/* Jira Create Issue Dialog */}
      <Dialog open={showJiraIssueDialog} onClose={() => setShowJiraIssueDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Jira Issue</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Summary"
            value={jiraIssueForm.summary}
            onChange={(e) => setJiraIssueForm({ ...jiraIssueForm, summary: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={jiraIssueForm.description}
            onChange={(e) => setJiraIssueForm({ ...jiraIssueForm, description: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Issue Type</InputLabel>
            <Select
              value={jiraIssueForm.issue_type}
              onChange={(e) => setJiraIssueForm({ ...jiraIssueForm, issue_type: e.target.value })}
              label="Issue Type"
            >
              <MenuItem value="Task">Task</MenuItem>
              <MenuItem value="Bug">Bug</MenuItem>
              <MenuItem value="Story">Story</MenuItem>
              <MenuItem value="Epic">Epic</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJiraIssueDialog(false)}>Cancel</Button>
          <Button onClick={createJiraIssue} variant="contained" disabled={loading || !jiraIssueForm.summary}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* GitLab Create Issue Dialog */}
      <Dialog open={showGitlabIssueDialog} onClose={() => setShowGitlabIssueDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create GitLab Issue</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={gitlabIssueForm.title}
            onChange={(e) => setGitlabIssueForm({ ...gitlabIssueForm, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={gitlabIssueForm.description}
            onChange={(e) => setGitlabIssueForm({ ...gitlabIssueForm, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Labels (comma-separated)"
            placeholder="bug, enhancement"
            value={gitlabIssueForm.labels}
            onChange={(e) => setGitlabIssueForm({ ...gitlabIssueForm, labels: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGitlabIssueDialog(false)}>Cancel</Button>
          <Button onClick={createGitlabIssue} variant="contained" disabled={loading || !gitlabIssueForm.title}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
