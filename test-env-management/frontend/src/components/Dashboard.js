'use client';

import { useEffect, useState } from 'react';
import { Server, Calendar, AlertTriangle, Activity, TrendingUp, Clock } from 'lucide-react';
import { environmentAPI, bookingAPI, monitoringAPI, analyticsAPI } from '@/lib/api';
import { getSocket, onMetricUpdate, offMetricUpdate } from '@/lib/socket';
import { format } from 'date-fns';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    environments: {},
    bookings: {},
    conflicts: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [criticalEnvs, setCriticalEnvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates
    const socket = getSocket();
    onMetricUpdate((data) => {
      console.log('Metric update received:', data);
      fetchDashboardData();
    });

    return () => {
      offMetricUpdate();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [envStats, bookingStats, monitoringData, analyticsData] = await Promise.all([
        environmentAPI.getStatistics(),
        bookingAPI.getStatistics(),
        monitoringAPI.getDashboard(),
        analyticsAPI.getDashboard()
      ]);

      setStats({
        environments: envStats.data.statistics,
        bookings: bookingStats.data.bookings,
        conflicts: bookingStats.data.conflicts
      });

      setCriticalEnvs(monitoringData.data.criticalEnvironments || []);
      setRecentActivities(monitoringData.data.recentActivities || []);
      
      // Fetch upcoming bookings
      const bookingsResponse = await bookingAPI.getAll({
        status: 'approved',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      setUpcomingBookings(bookingsResponse.data.bookings.slice(0, 5));

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text', 'bg').replace('600', '100')}`}>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">Real-time view of your test environment infrastructure</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Environments"
          value={stats.environments.total_environments || 0}
          icon={Server}
          color="text-blue-600"
          subtitle={`${stats.environments.available || 0} available`}
        />
        <StatCard
          title="Active Bookings"
          value={stats.bookings.active_bookings || 0}
          icon={Calendar}
          color="text-green-600"
          subtitle={`${stats.bookings.pending_bookings || 0} pending approval`}
        />
        <StatCard
          title="Unresolved Conflicts"
          value={stats.conflicts.unresolved_conflicts || 0}
          icon={AlertTriangle}
          color="text-orange-600"
          subtitle={stats.conflicts.critical_conflicts > 0 ? `${stats.conflicts.critical_conflicts} critical` : 'No critical'}
        />
        <StatCard
          title="System Health"
          value={criticalEnvs.length === 0 ? '100%' : `${Math.max(0, 100 - criticalEnvs.length * 10)}%`}
          icon={Activity}
          color={criticalEnvs.length === 0 ? 'text-green-600' : 'text-red-600'}
          subtitle={criticalEnvs.length > 0 ? `${criticalEnvs.length} critical alerts` : 'All systems operational'}
        />
      </div>

      {/* Environment Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Environment Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Available</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-green-500 rounded-full" 
                    style={{ width: `${(stats.environments.available / stats.environments.total_environments * 100) || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold">{stats.environments.available || 0}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">In Use</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-blue-500 rounded-full" 
                    style={{ width: `${(stats.environments.in_use / stats.environments.total_environments * 100) || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold">{stats.environments.in_use || 0}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Maintenance</span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                  <div 
                    className="h-2 bg-yellow-500 rounded-full" 
                    style={{ width: `${(stats.environments.maintenance / stats.environments.total_environments * 100) || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold">{stats.environments.maintenance || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Environment Types</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Dev', value: stats.environments.dev_count, color: 'bg-purple-100 text-purple-700' },
              { label: 'QA', value: stats.environments.qa_count, color: 'bg-blue-100 text-blue-700' },
              { label: 'Staging', value: stats.environments.staging_count, color: 'bg-green-100 text-green-700' },
              { label: 'UAT', value: stats.environments.uat_count, color: 'bg-orange-100 text-orange-700' }
            ].map((item) => (
              <div key={item.label} className={`p-4 rounded-lg ${item.color}`}>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Bookings and Critical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Upcoming Bookings
            </h3>
          </div>
          <div className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No upcoming bookings</p>
            ) : (
              upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{booking.project_name}</p>
                    <p className="text-xs text-gray-600">{booking.environment_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(booking.start_time), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full priority-${booking.priority}`}>
                    {booking.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Critical Alerts
            </h3>
          </div>
          <div className="space-y-3">
            {criticalEnvs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-500">All systems operational</p>
              </div>
            ) : (
              criticalEnvs.map((env) => (
                <div key={env.id} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{env.name}</p>
                    <p className="text-xs text-gray-600 capitalize">{env.type} Environment</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
        <div className="space-y-2">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No recent activities</p>
          ) : (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    by {activity.user_name || 'System'} • {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  activity.action === 'create' ? 'bg-green-100 text-green-700' :
                  activity.action === 'update' ? 'bg-blue-100 text-blue-700' :
                  activity.action === 'delete' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {activity.action}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
