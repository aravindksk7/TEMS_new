'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const TABS = ['Overview', 'Utilization', 'Users', 'Conflicts', 'Trends', 'Performance', 'Export'];

export default function Analytics({ user }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(false);

  // Overview dashboard
  const [overview, setOverview] = useState(null);

  // Utilization
  const [utilParams, setUtilParams] = useState({ start_date: '', end_date: '' });
  const [utilization, setUtilization] = useState([]);

  // Users activity
  const [userParams, setUserParams] = useState({ start_date: '', end_date: '' });
  const [userActivity, setUserActivity] = useState([]);

  // Conflicts
  const [conflicts, setConflicts] = useState([]);
  const [resolving, setResolving] = useState(false);

  // Trends
  const [trends, setTrends] = useState([]);

  // Performance
  const [performance, setPerformance] = useState([]);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.getDashboard();
      setOverview(resp.data.overallStats || resp.data);
    } catch (err) {
      toast.error('Failed to load overview');
    } finally {
      setLoading(false);
    }
  };

  const runUtilization = async () => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.getUtilization(utilParams);
      setUtilization(resp.data.utilization || []);
    } catch (err) {
      toast.error('Failed to fetch utilization');
    } finally {
      setLoading(false);
    }
  };

  const runUserActivity = async () => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.getUserActivity(userParams);
      setUserActivity(resp.data.userActivity || []);
    } catch (err) {
      toast.error('Failed to fetch user activity');
    } finally {
      setLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.getConflicts();
      setConflicts(resp.data.conflictDetails || resp.data.conflicts || []);
    } catch (err) {
      toast.error('Failed to fetch conflicts');
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (conflictId) => {
    try {
      setResolving(true);
      await analyticsAPI.resolveConflict(conflictId, { resolution_notes: 'Resolved via Analytics UI' });
      toast.success('Conflict resolved');
      fetchConflicts();
      fetchOverview();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  const runTrends = async () => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.getTrends({ period: 'week' });
      setTrends(resp.data.trends || []);
    } catch (err) {
      toast.error('Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  };

  const runPerformance = async () => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.getPerformance();
      setPerformance(resp.data.performance || []);
    } catch (err) {
      toast.error('Failed to fetch performance');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      setLoading(true);
      const resp = await analyticsAPI.exportReport({ report_type: type, start_date: utilParams.start_date, end_date: utilParams.end_date });
      const blob = new Blob([resp.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = utilParams.start_date && utilParams.end_date ? `_${utilParams.start_date}_${utilParams.end_date}` : '';
      a.download = `${type}_report${suffix}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  // Tab renderers
  const renderOverview = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Overview</h3>
      {overview ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded shadow"> 
            <div className="text-sm text-gray-500">Environments</div>
            <div className="text-2xl font-bold">{overview.total_environments}</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Total Bookings</div>
            <div className="text-2xl font-bold">{overview.total_bookings}</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Active Users</div>
            <div className="text-2xl font-bold">{overview.active_users}</div>
          </div>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );

  const renderUtilization = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Utilization</h3>
      <div className="flex gap-2 mb-4">
        <input type="date" value={utilParams.start_date} onChange={(e)=>setUtilParams({...utilParams, start_date: e.target.value})} className="border p-2 rounded" />
        <input type="date" value={utilParams.end_date} onChange={(e)=>setUtilParams({...utilParams, end_date: e.target.value})} className="border p-2 rounded" />
        <button onClick={runUtilization} className="px-3 py-2 bg-blue-600 text-white rounded">Run</button>
      </div>
      <div className="space-y-3">
        {utilization.length === 0 ? <div className="text-gray-500">No data</div> : (
          <div style={{ width: '100%', height: 300 }} className="bg-white rounded shadow p-2">
            <ResponsiveContainer>
              <BarChart data={utilization} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_hours_booked" name="Hours Booked" fill="#3182ce" />
                <Bar dataKey="utilization_percentage" name="Util %" fill="#63b3ed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">User Activity</h3>
      <div className="flex gap-2 mb-4">
        <input type="date" value={userParams.start_date} onChange={(e)=>setUserParams({...userParams, start_date: e.target.value})} className="border p-2 rounded" />
        <input type="date" value={userParams.end_date} onChange={(e)=>setUserParams({...userParams, end_date: e.target.value})} className="border p-2 rounded" />
        <button onClick={runUserActivity} className="px-3 py-2 bg-blue-600 text-white rounded">Run</button>
      </div>
      {userActivity.length === 0 ? <div className="text-gray-500">No data</div> : (
        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-50"><tr><th className="p-2">User</th><th className="p-2">Bookings</th><th className="p-2">Completed</th></tr></thead>
          <tbody>
            {userActivity.map(u => (
              <tr key={u.id} className="border-t"><td className="p-2">{u.full_name}</td><td className="p-2">{u.total_bookings || 0}</td><td className="p-2">{u.completed_bookings || 0}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderConflicts = () => (
    <div>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold mb-4">Conflicts</h3>
        <div>
          <button onClick={fetchConflicts} className="px-3 py-2 bg-gray-200 rounded mr-2">Refresh</button>
          <button onClick={()=>{ fetchOverview(); fetchConflicts(); }} className="px-3 py-2 bg-blue-600 text-white rounded">Refresh All</button>
        </div>
      </div>
      {conflicts.length === 0 ? <div className="text-gray-500">No unresolved conflicts</div> : (
        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-50"><tr><th className="p-2">ID</th><th className="p-2">Type</th><th className="p-2">Severity</th><th className="p-2">Detected</th><th className="p-2">Actions</th></tr></thead>
          <tbody>
            {conflicts.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.id}</td>
                <td className="p-2">{c.conflict_type}</td>
                <td className="p-2">{c.severity}</td>
                <td className="p-2">{format(new Date(c.detected_at), 'PP p')}</td>
                <td className="p-2">
                  <button disabled={resolving} onClick={()=>resolve(c.id)} className="px-2 py-1 bg-green-600 text-white rounded mr-2">Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderTrends = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Trends</h3>
      <div className="mb-4">
        <button onClick={runTrends} className="px-3 py-2 bg-blue-600 text-white rounded">Load Weekly Trends</button>
      </div>
      {trends.length === 0 ? <div className="text-gray-500">No trends data</div> : (
        <div style={{ width: '100%', height: 320 }} className="bg-white rounded shadow p-2">
          <ResponsiveContainer>
            <LineChart data={trends} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total_bookings" stroke="#4fd1c5" name="Total" />
              <Line type="monotone" dataKey="approved" stroke="#3182ce" name="Approved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  const renderPerformance = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Environment Performance</h3>
      <div className="mb-4"><button onClick={runPerformance} className="px-3 py-2 bg-blue-600 text-white rounded">Load Performance</button></div>
      {performance.length === 0 ? <div className="text-gray-500">No performance data</div> : (
        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-50"><tr><th className="p-2">Environment</th><th className="p-2">Avg CPU</th><th className="p-2">Avg Memory</th></tr></thead>
          <tbody>
            {performance.map(p => (
              <tr key={p.id} className="border-t"><td className="p-2">{p.name}</td><td className="p-2">{p.avg_cpu || '-'}</td><td className="p-2">{p.avg_memory || '-'}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderExport = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Export Reports</h3>
      <div className="flex gap-2">
        <button onClick={()=>exportReport('utilization')} className="px-3 py-2 bg-gray-200 rounded">Export Utilization</button>
        <button onClick={()=>exportReport('bookings')} className="px-3 py-2 bg-gray-200 rounded">Export Bookings</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
      <div className="bg-white p-4 rounded shadow-sm border">
        <div className="flex gap-2 mb-4">
          {TABS.map(tab => (
            <button key={tab} onClick={()=>{setActiveTab(tab); if (tab === 'Conflicts') fetchConflicts(); if (tab === 'Overview') fetchOverview();}} className={`px-3 py-2 rounded ${activeTab===tab?'bg-blue-600 text-white':'bg-gray-100'}`}>{tab}</button>
          ))}
        </div>

        <div>
          {loading && <div className="text-sm text-gray-500 mb-2">Loading...</div>}
          {activeTab === 'Overview' && renderOverview()}
          {activeTab === 'Utilization' && renderUtilization()}
          {activeTab === 'Users' && renderUsers()}
          {activeTab === 'Conflicts' && renderConflicts()}
          {activeTab === 'Trends' && renderTrends()}
          {activeTab === 'Performance' && renderPerformance()}
          {activeTab === 'Export' && renderExport()}
        </div>
      </div>
    </div>
  );
}
