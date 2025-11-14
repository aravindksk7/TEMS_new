'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { monitoringAPI, analyticsAPI, bookingAPI } from '@/lib/api';

function formatDateKey(d) {
  const dt = new Date(d);
  return dt.toISOString().slice(0,10);
}

function nextNDays(n) {
  const days = [];
  const today = new Date();
  for (let i=0;i<n;i++) {
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    days.push(d);
  }
  return days;
}

export default function Monitoring({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [conflicts, setConflicts] = useState([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState({ visible:false, conflict:null, notes: '' });
  const [calendarBookings, setCalendarBookings] = useState([]);

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'conflicts') fetchConflicts();
    if (activeTab === 'calendar') fetchCalendarBookings();
  }, [activeTab]);

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
      // use raw conflict rows for resolution
      setConflicts(resp.data.conflictDetails || []);
    } catch (err) {
      console.error('Failed to fetch conflicts', err);
    } finally {
      setConflictLoading(false);
    }
  };

  const openResolve = (c) => setResolveModal({ visible:true, conflict:c, notes: '' });

  const confirmResolve = async () => {
    try {
      await analyticsAPI.resolveConflict(resolveModal.conflict.id, { resolution_notes: resolveModal.notes });
      setResolveModal({ visible:false, conflict:null, notes: '' });
      fetchConflicts();
      fetchMonitoring();
    } catch (err) {
      console.error('Resolve failed', err);
    }
  };

  const fetchCalendarBookings = async () => {
    try {
      // fetch next 7 days bookings
      const days = nextNDays(7);
      const start = days[0].toISOString().slice(0,10) + ' 00:00:00';
      const endDate = new Date(days[days.length-1]);
      endDate.setHours(23,59,59);
      const end = endDate.toISOString().slice(0,19).replace('T',' ');
      const resp = await bookingAPI.getAll({ start_date: start, end_date: end });
      setCalendarBookings(resp.data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch calendar bookings', err);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-Time Monitoring</h2>
        <div className="space-x-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1 rounded ${activeTab==='dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('conflicts')} className={`px-3 py-1 rounded ${activeTab==='conflicts' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Conflicts</button>
          <button onClick={() => setActiveTab('calendar')} className={`px-3 py-1 rounded ${activeTab==='calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Calendar</button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Activity className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-semibold">Active Bookings</h3>
            <p className="text-3xl font-bold text-gray-900">{dashboard?.activeBookings || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Activity className="h-8 w-8 text-orange-600 mb-2" />
            <h3 className="font-semibold">Unresolved Conflicts</h3>
            <p className="text-3xl font-bold text-gray-900">{dashboard?.unresolvedConflicts || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Activity className="h-8 w-8 text-red-600 mb-2" />
            <h3 className="font-semibold">Critical Environments</h3>
            <p className="text-3xl font-bold text-gray-900">{dashboard?.criticalEnvironments?.length || 0}</p>
          </div>
        </div>
      )}

      {activeTab === 'conflicts' && (
        <div>
          <h3 className="text-lg font-semibold">Unresolved Conflicts</h3>
          {conflictLoading ? (
            <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="mt-4 bg-white rounded-lg border p-4">
              {conflicts.length === 0 ? <p>No conflicts found</p> : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th>Id</th><th>Type</th><th>Severity</th><th>Detected</th><th>Actions</th></tr></thead>
                  <tbody>
                    {conflicts.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{c.id}</td>
                        <td className="px-4 py-2 text-sm">{c.conflict_type}</td>
                        <td className="px-4 py-2 text-sm">{c.severity}</td>
                        <td className="px-4 py-2 text-sm">{c.detected_at ? new Date(c.detected_at).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          <button onClick={() => openResolve(c)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Resolve</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {resolveModal.visible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-lg font-semibold">Resolve Conflict</h3>
                  <button onClick={() => setResolveModal({ visible:false, conflict:null, notes: '' })} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5"/></button>
                </div>
                <div className="p-6">
                  <p className="mb-3">Add resolution notes (optional)</p>
                  <textarea className="w-full border rounded p-2" rows={4} value={resolveModal.notes} onChange={(e)=>setResolveModal({...resolveModal, notes:e.target.value})} />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setResolveModal({ visible:false, conflict:null, notes: '' })} className="flex-1 px-4 py-2 border rounded">Cancel</button>
                    <button onClick={confirmResolve} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">Confirm Resolve</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div>
          <h3 className="text-lg font-semibold mb-2">7-Day Calendar</h3>
          <div className="grid grid-cols-7 gap-2">
            {nextNDays(7).map(d => {
              const key = formatDateKey(d);
              const items = calendarBookings.filter(b => formatDateKey(b.start_time) === key || formatDateKey(b.end_time) === key);
              return (
                <div key={key} className="border rounded p-2 bg-white">
                  <div className="text-sm font-semibold mb-1">{d.toDateString().slice(0,10)}</div>
                  {items.length === 0 ? <div className="text-xs text-gray-500">No bookings</div> : items.map(it => (
                    <div key={it.id} className="mb-1 p-1 border rounded bg-gray-50 text-xs">
                      <div className="font-medium">{it.project_name || '(no title)'}</div>
                      <div className="text-gray-600">{it.environment_name}</div>
                      <div className="text-gray-500 text-xs">{new Date(it.start_time).toLocaleTimeString()} - {new Date(it.end_time).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
