import React, { useState, useEffect } from "react";
import { useGetSystemHealthQuery, useGetSystemAlertsQuery, useGetServerMetricsQuery, useGetDatabaseMetricsQuery, useGetSystemPerformanceHistoryQuery } from "../../Redux/AllApi/SuperAdminApi";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RefreshCcw, Server, Database, AlertTriangle, CheckCircle, XCircle, Clock, Activity, Cpu, HardDrive, Users } from "lucide-react";
import { toast } from "react-hot-toast";

const SystemMonitoring = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // API queries
  const { data: systemHealth, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useGetSystemHealthQuery(undefined, {
    pollingInterval: autoRefresh ? refreshInterval : 0,
  });

  const { data: systemAlerts, isLoading: alertsLoading, refetch: refetchAlerts } = useGetSystemAlertsQuery(undefined, {
    pollingInterval: autoRefresh ? refreshInterval : 0,
  });

  const { data: serverMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useGetServerMetricsQuery(undefined, {
    pollingInterval: autoRefresh ? refreshInterval : 0,
  });

  const { data: databaseMetrics, isLoading: dbLoading, refetch: refetchDatabase } = useGetDatabaseMetricsQuery(undefined, {
    pollingInterval: autoRefresh ? refreshInterval : 0,
  });

  const { data: performanceHistory, isLoading: perfLoading, refetch: refetchPerformance } = useGetSystemPerformanceHistoryQuery({ period: selectedTimePeriod }, {
    pollingInterval: autoRefresh ? refreshInterval * 2 : 0, // Less frequent for history
  });

  // Manual refresh all data
  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetchHealth(),
        refetchAlerts(),
        refetchMetrics(),
        refetchDatabase(),
        refetchPerformance()
      ]);
      toast.success('System data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh system data');
    }
  };

  // Get status color based on health status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'text-[#16a34a]';
      case 'warning':
        return 'text-[#ca8a04]';
      case 'critical':
      case 'unhealthy':
        return 'text-[#dc2626]';
      default:
        return 'text-[#4b5563]';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'bg-[#dcfce7]';
      case 'warning':
        return 'bg-[#fef9c3]';
      case 'critical':
      case 'unhealthy':
        return 'bg-[#fee2e2]';
      default:
        return 'bg-[#f3f4f6]';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-[#16a34a]" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-[#ca8a04]" />;
      case 'critical':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-[#dc2626]" />;
      default:
        return <Clock className="h-5 w-5 text-[#4b5563]" />;
    }
  };

  // Format uptime
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Colors for charts
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">System Monitoring & Health</h1>
          <p className="text-[#4b5563] mt-1">
            Real-time system health, performance, and resource monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-[#374151]">Auto-refresh:</label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 text-xs rounded-full font-medium ${autoRefresh
                ? 'bg-[#dcfce7] text-[#166534]'
                : 'bg-[#f3f4f6] text-[#1f2937]'
                }`}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={healthLoading}
            className="inline-flex items-center px-4 py-2 bg-[#4f46e5] text-[#ffffff] text-sm font-medium rounded-lg hover:bg-[#4338ca] disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Health Status */}
        <div className={`rounded-lg shadow-sm border p-6 ${getStatusBgColor(systemHealth?.data?.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">System Health</p>
              <p className={`text-2xl font-bold ${getStatusColor(systemHealth?.data?.status)}`}>
                {systemHealth?.data?.score || 0}%
              </p>
              <p className={`text-sm font-medium ${getStatusColor(systemHealth?.data?.status)}`}>
                {systemHealth?.data?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-[#ffffff]">
              {getStatusIcon(systemHealth?.data?.status)}
            </div>
          </div>
        </div>

        {/* Server Status */}
        <div className="bg-[#ffffff] rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Server Status</p>
              <p className="text-2xl font-bold text-[#16a34a]">
                {formatUptime(systemHealth?.data?.server?.uptime || 0)}
              </p>
              <p className="text-sm text-[#6b7280]">Uptime</p>
            </div>
            <div className="p-3 bg-[#dbeafe] rounded-full">
              <Server className="h-6 w-6 text-[#2563eb]" />
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className={`rounded-lg shadow-sm border p-6 ${getStatusBgColor(systemHealth?.data?.database?.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Database</p>
              <p className={`text-2xl font-bold ${getStatusColor(systemHealth?.data?.database?.status)}`}>
                {systemHealth?.data?.database?.responseTime || 0}ms
              </p>
              <p className={`text-sm font-medium ${getStatusColor(systemHealth?.data?.database?.status)}`}>
                {systemHealth?.data?.database?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-[#ffffff]">
              <Database className="h-6 w-6 text-[#16a34a]" />
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Active Alerts</p>
              <p className="text-2xl font-bold text-[#dc2626]">
                {systemAlerts?.data?.count || 0}
              </p>
              <p className="text-sm text-[#6b7280]">Alerts</p>
            </div>
            <div className="p-3 bg-[#fee2e2] rounded-full">
              <AlertTriangle className="h-6 w-6 text-[#dc2626]" />
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts Section */}
      {systemAlerts?.data?.alerts && systemAlerts.data.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-[#111827] flex items-center">
              <AlertTriangle className="h-5 w-5 text-[#dc2626] mr-2" />
              Active System Alerts
            </h3>
          </div>
          <div className="divide-y">
            {systemAlerts.data.alerts.map((alert, index) => (
              <div key={index} className={`p-4 ${alert.type === 'error' ? 'bg-[#fee2e2] border-l-4 border-[#f87171]' :
                alert.type === 'warning' ? 'bg-[#fef9c3] border-l-4 border-[#facc15]' :
                  'bg-[#dbeafe] border-l-4 border-[#60a5fa]'
                }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium ${alert.type === 'error' ? 'text-[#991b1b]' :
                      alert.type === 'warning' ? 'text-[#854d0e]' :
                        'text-[#1e40af]'
                      }`}>
                      {alert.title}
                    </p>
                    <p className={`text-sm ${alert.type === 'error' ? 'text-[#dc2626]' :
                      alert.type === 'warning' ? 'text-[#ca8a04]' :
                        'text-[#2563eb]'
                      }`}>
                      {alert.message}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${alert.type === 'error' ? 'bg-[#fee2e2] text-[#991b1b]' :
                    alert.type === 'warning' ? 'bg-[#fef9c3] text-[#854d0e]' :
                      'bg-[#dbeafe] text-[#1e40af]'
                    }`}>
                    {alert.type.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Server Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-[#111827] flex items-center">
              <Cpu className="h-5 w-5 text-[#2563eb] mr-2" />
              Memory Usage
            </h3>
          </div>
          <div className="p-6">
            {serverMetrics?.data?.memory && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[#4b5563]">Heap Used</span>
                  <span className="text-sm text-[#111827]">
                    {serverMetrics.data.memory.heapUsed}MB / {serverMetrics.data.memory.heapTotal}MB
                  </span>
                </div>
                <div className="w-full bg-[#e5e7eb] rounded-full h-2">
                  <div
                    className="bg-[#2563eb] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${serverMetrics.data.memory.heapUsagePercent}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm font-medium text-[#374151]">
                  {serverMetrics.data.memory.heapUsagePercent}% Used
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                  <div>
                    <p className="text-[#4b5563]">RSS</p>
                    <p className="font-medium">{serverMetrics.data.memory.rss}MB</p>
                  </div>
                  <div>
                    <p className="text-[#4b5563]">External</p>
                    <p className="font-medium">{serverMetrics.data.memory.external}MB</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-[#111827] flex items-center">
              <HardDrive className="h-5 w-5 text-[#16a34a] mr-2" />
              System Information
            </h3>
          </div>
          <div className="p-6">
            {serverMetrics?.data && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#4b5563]">Node.js Version</span>
                  <span className="text-sm font-medium text-[#111827]">{serverMetrics.data.process.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#4b5563]">Platform</span>
                  <span className="text-sm font-medium text-[#111827]">{serverMetrics.data.process.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#4b5563]">Architecture</span>
                  <span className="text-sm font-medium text-[#111827]">{serverMetrics.data.process.arch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#4b5563]">Process ID</span>
                  <span className="text-sm font-medium text-[#111827]">{serverMetrics.data.process.pid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#4b5563]">Environment</span>
                  <span className="text-sm font-medium text-[#111827]">{serverMetrics.data.environment.nodeEnv}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#4b5563]">Port</span>
                  <span className="text-sm font-medium text-[#111827]">{serverMetrics.data.environment.port}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Metrics */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-[#111827] flex items-center">
            <Database className="h-5 w-5 text-[#9333ea] mr-2" />
            Database Statistics
          </h3>
        </div>
        <div className="p-6">
          {databaseMetrics?.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Collection Counts */}
              <div>
                <h4 className="text-sm font-semibold text-[#374151] mb-3">Collection Sizes</h4>
                <div className="space-y-2">
                  {Object.entries(databaseMetrics.data.collections).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-[#4b5563] capitalize">{key}</span>
                      <span className="font-medium text-[#111827]">{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection Info */}
              <div>
                <h4 className="text-sm font-semibold text-[#374151] mb-3">Connection Info</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Status</span>
                    <span className={`font-medium ${getStatusColor(databaseMetrics.data.connection.readyStateText)}`}>
                      {databaseMetrics.data.connection.readyStateText}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Host</span>
                    <span className="font-medium text-[#111827]">{databaseMetrics.data.connection.host}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Port</span>
                    <span className="font-medium text-[#111827]">{databaseMetrics.data.connection.port}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Database</span>
                    <span className="font-medium text-[#111827]">{databaseMetrics.data.connection.name}</span>
                  </div>
                </div>
              </div>

              {/* Health Status */}
              <div>
                <h4 className="text-sm font-semibold text-[#374151] mb-3">Health Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Response Time</span>
                    <span className={`font-medium ${databaseMetrics.data.health.responseTime < 100 ? 'text-[#16a34a]' :
                      databaseMetrics.data.health.responseTime < 500 ? 'text-[#ca8a04]' : 'text-[#dc2626]'
                      }`}>
                      {databaseMetrics.data.health.responseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Status</span>
                    <span className={`font-medium ${getStatusColor(databaseMetrics.data.health.status)}`}>
                      {databaseMetrics.data.health.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4b5563]">Connected</span>
                    <span className={`font-medium ${databaseMetrics.data.health.connected ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                      {databaseMetrics.data.health.connected ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827] flex items-center">
            <Activity className="h-5 w-5 text-[#16a34a] mr-2" />
            System Performance History
          </h3>
          <select
            value={selectedTimePeriod}
            onChange={(e) => setSelectedTimePeriod(e.target.value)}
            className="text-sm border border-[#d1d5db] rounded-md px-3 py-1"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
        <div className="p-6">
          {performanceHistory?.data?.dataPoints && performanceHistory.data.dataPoints.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Memory Usage Over Time */}
              <div>
                <h4 className="text-sm font-semibold text-[#374151] mb-3">Memory Usage (MB)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceHistory.data.dataPoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value) => [`${value} MB`, 'Memory']}
                      />
                      <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* System Activity */}
              <div>
                <h4 className="text-sm font-semibold text-[#374151] mb-3">System Activity</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceHistory.data.dataPoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="activities" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="errors" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[#6b7280]">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No performance data available</p>
            </div>
          )}
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Active Users</p>
              <p className="text-2xl font-bold text-[#2563eb]">
                {systemHealth?.data?.activeUsers || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-[#2563eb]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Recent Errors</p>
              <p className="text-2xl font-bold text-[#dc2626]">
                {systemHealth?.data?.recentErrors || 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-[#dc2626]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Total Collections</p>
              <p className="text-2xl font-bold text-[#16a34a]">
                {systemHealth?.data?.collections ? Object.keys(systemHealth.data.collections).length : 0}
              </p>
            </div>
            <Database className="h-8 w-8 text-[#16a34a]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Health Score</p>
              <p className={`text-2xl font-bold ${getStatusColor(systemHealth?.data?.status)}`}>
                {systemHealth?.data?.score || 0}%
              </p>
            </div>
            <Activity className={`h-8 w-8 ${getStatusColor(systemHealth?.data?.status)}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;
