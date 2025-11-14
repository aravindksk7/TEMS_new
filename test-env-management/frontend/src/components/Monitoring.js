'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { monitoringAPI } from '@/lib/api';

export default function Monitoring({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 10000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Real-Time Monitoring</h2>
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
    </div>
  );
}
