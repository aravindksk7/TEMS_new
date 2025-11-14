'use client';

import { useEffect, useState } from 'react';
import { Server, Plus, Search, X } from 'lucide-react';
import { environmentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function Environments({ user }) {
  const [environments, setEnvironments] = useState([]);
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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configForm, setConfigForm] = useState({ category: 'application', name: '', settings: {} });
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);

  useEffect(() => {
    fetchEnvironments();
  }, [filterStatus]);

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      const response = await environmentAPI.getAll({ status: filterStatus, search: searchTerm });
      setEnvironments(response.data.environments);
    } catch (error) {
      toast.error('Failed to fetch environments');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async (envId) => {
    try {
      setConfigLoading(true);
      const response = await environmentAPI.getConfigs(envId);
      setConfigs(response.data.configurations || []);
    } catch (error) {
      toast.error('Failed to load configurations');
    } finally {
      setConfigLoading(false);
    }
  };

  const openConfigModal = async (env) => {
    setSelectedEnv(env);
    setShowConfigModal(true);
    setEditingConfigId(null);
    setConfigForm({ category: 'application', name: '', settings: {} });
    await fetchConfigs(env.id);
  };

  const handleAddOrUpdateConfig = async (e) => {
    e.preventDefault();
    if (!configForm.name || !configForm.category) {
      toast.error('Category and name are required');
      return;
    }
    try {
      setConfigSubmitting(true);
      if (editingConfigId) {
        await environmentAPI.updateConfig(selectedEnv.id, editingConfigId, configForm);
        toast.success('Configuration updated');
      } else {
        await environmentAPI.createConfig(selectedEnv.id, configForm);
        toast.success('Configuration added');
      }
      await fetchConfigs(selectedEnv.id);
      setConfigForm({ category: 'application', name: '', settings: {} });
      setEditingConfigId(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setConfigSubmitting(false);
    }
  };

  const handleEditConfig = (cfg) => {
    setEditingConfigId(cfg.id);
    setConfigForm({ category: cfg.category, name: cfg.name, settings: cfg.settings || {} });
  };

  const handleDeleteConfig = async (cfgId) => {
    if (!confirm('Delete this configuration?')) return;
    try {
      await environmentAPI.deleteConfig(selectedEnv.id, cfgId);
      toast.success('Configuration deleted');
      await fetchConfigs(selectedEnv.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete configuration');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.type) {
      toast.error('Name and type are required');
      return;
    }
    try {
      setSubmitting(true);
      await environmentAPI.create(formData);
      toast.success('Environment created successfully');
      setShowModal(false);
      setFormData({ name: '', type: 'dev', description: '', url: '', status: 'available' });
      fetchEnvironments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create environment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Environments</h2>
        {(user.role === 'admin' || user.role === 'manager') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Environment
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Create Environment</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., QA-Environment-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dev">Development</option>
                  <option value="qa">QA</option>
                  <option value="staging">Staging</option>
                  <option value="uat">UAT</option>
                  <option value="production">Production</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="in-use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="provisioning">Provisioning</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search environments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchEnvironments()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="in-use">In Use</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {environments.map((env) => (
            <div key={env.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <Server className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{env.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{env.type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full status-${env.status}`}>
                  {env.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{env.description}</p>
              {env.url && (
                <a href={env.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {env.url}
                </a>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openConfigModal(env)}
                  className="px-3 py-1 text-sm bg-gray-100 border rounded-md hover:bg-gray-200"
                >
                  Manage Configs
                </button>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit Environment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Configuration modal */}
      {showConfigModal && selectedEnv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Configurations - {selectedEnv.name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowConfigModal(false); setSelectedEnv(null); }} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">Manage applications, hardware and network configs for this environment.</div>
                <div>
                  <select value={configForm.category} onChange={(e) => setConfigForm({ ...configForm, category: e.target.value })} className="px-3 py-2 border rounded-md mr-2">
                    <option value="application">Application</option>
                    <option value="hardware">Hardware</option>
                    <option value="network">Network</option>
                  </select>
                  <input type="text" placeholder="Name" value={configForm.name} onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })} className="px-3 py-2 border rounded-md mr-2" />
                  <button onClick={handleAddOrUpdateConfig} disabled={configSubmitting} className="px-3 py-2 bg-blue-600 text-white rounded-md">{editingConfigId ? 'Update' : 'Add'}</button>
                </div>
              </div>

              <div className="space-y-4">
                {configLoading ? (
                  <div className="py-8 text-center">Loading configurations...</div>
                ) : (
                  configs.length === 0 ? (
                    <div className="text-sm text-gray-500">No configurations yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {configs.map((cfg) => (
                        <div key={cfg.id} className="border rounded-md p-3 flex justify-between items-start">
                          <div>
                            <div className="font-medium">{cfg.name} <span className="text-xs lowercase text-gray-500">({cfg.category})</span></div>
                            <div className="text-sm text-gray-600 mt-1">{cfg.settings && typeof cfg.settings === 'object' ? JSON.stringify(cfg.settings) : String(cfg.settings)}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditConfig(cfg)} className="px-2 py-1 bg-yellow-100 rounded-md text-sm">Edit</button>
                            <button onClick={() => handleDeleteConfig(cfg.id)} className="px-2 py-1 bg-red-100 rounded-md text-sm">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
