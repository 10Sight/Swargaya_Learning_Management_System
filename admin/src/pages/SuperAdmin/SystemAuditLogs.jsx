import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  IconFileAnalytics,
  IconSearch,
  IconFilter,
  IconDownload,
  IconEye,
  IconRefresh,
  IconCalendar,
  IconUser,
  IconAlertTriangle,
  IconShield,
  IconActivity,
  IconClock,
  IconX,
  IconChevronDown,
  IconArrowUp,
  IconArrowDown,
  IconExclamationMark,
  IconMapPin,
  IconDeviceDesktop,
  IconTag
} from "@tabler/icons-react";
import {
  useGetAllAuditLogsQuery,
  useGetAuditLogByIdQuery,
  useDeleteAuditLogMutation
} from "@/Redux/AllApi/SuperAdminApi";
import { toast } from "sonner";

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const InfoField = ({ icon: Icon, label, value, mono = false }) => (
  <div className="rounded-lg border border-[#eef0f2] bg-[#f9fafb] p-3">
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af] mb-1">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </div>
    <div className={`text-sm text-[#111827] ${mono ? "font-mono break-all" : "break-words"}`}>
      {value ?? "N/A"}
    </div>
  </div>
);

const SystemAuditLogs = () => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showLogDetail, setShowLogDetail] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateRange, setDateRange] = useState("all");

  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
    ipAddress: "",
    severity: ""
  });

  // Date range calculations
  const getDateRangeFilter = () => {
    const now = new Date();
    let dateFrom = null;
    let dateTo = null;

    switch (dateRange) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = new Date();
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = new Date();
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateTo = new Date();
        break;
      case 'custom':
        dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
        dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
        break;
      default: // 'all' case
        dateFrom = null;
        dateTo = null;
        break;
    }

    return { dateFrom, dateTo };
  };

  const { dateFrom, dateTo } = getDateRangeFilter();

  // API hooks with conditional parameters
  const apiParams = {
    page: currentPage,
    limit: 20,
    sortBy,
    order: sortOrder,
  };

  // Only add parameters that have values to avoid sending empty strings
  if (filters.action) apiParams.action = filters.action;
  if (filters.userId) apiParams.userId = filters.userId;
  if (filters.ipAddress) apiParams.ipAddress = filters.ipAddress;
  if (filters.severity) apiParams.severity = filters.severity;
  if (dateFrom) apiParams.dateFrom = dateFrom.toISOString();
  if (dateTo) apiParams.dateTo = dateTo.toISOString();
  if (searchTerm) apiParams.search = searchTerm;

  const {
    data: auditLogsData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetAllAuditLogsQuery(apiParams);

  // Handle different possible API response structures
  const auditLogs = auditLogsData?.data?.audits ||
    auditLogsData?.data?.logs ||
    auditLogsData?.audits ||
    auditLogsData?.logs ||
    [];

  const totalPages = auditLogsData?.data?.pagination?.pages ||
    auditLogsData?.data?.pagination?.totalPages ||
    auditLogsData?.data?.totalPages ||
    auditLogsData?.pagination?.pages ||
    auditLogsData?.pagination?.totalPages ||
    auditLogsData?.totalPages ||
    Math.ceil((auditLogsData?.data?.pagination?.total || auditLogsData?.data?.total || auditLogs.length) / 20);

  const totalLogs = auditLogsData?.data?.pagination?.total ||
    auditLogsData?.data?.total ||
    auditLogsData?.pagination?.total ||
    auditLogsData?.total ||
    auditLogs.length;

  const handleExportLogs = async () => {
    try {
      // Create a CSV export of visible logs
      const csvContent = [
        // Header
        ['Date', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'].join(','),
        // Data rows
        ...auditLogs.map(log => [
          new Date(log.createdAt).toLocaleString(),
          log.user ? log.user.fullName : 'System',
          log.action,
          log.resourceType || 'N/A',
          log.resourceId || 'N/A',
          log.ip || 'N/A',
          log.userAgent || 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Audit logs exported successfully!');
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error('Failed to export audit logs');
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "high":
        return "bg-rose-50 text-rose-700 border-l-2 border-rose-500";
      case "medium":
        return "bg-amber-50 text-amber-700 border-l-2 border-amber-500";
      case "low":
        return "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500";
      default:
        return "bg-gray-50 text-gray-700 border-l-2 border-gray-400";
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "success":
        return "bg-emerald-50 text-emerald-700";
      case "failed":
        return "bg-rose-50 text-rose-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('DELETE')) return IconAlertTriangle;
    if (action.includes('LOGIN')) return IconUser;
    if (action.includes('SYSTEM')) return IconShield;
    if (action.includes('CREATE') || action.includes('UPDATE')) return IconActivity;
    return IconFileAnalytics;
  };

  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'custom', label: 'Custom' }
  ];

  const statCards = [
    {
      label: "Total Events",
      value: totalLogs,
      icon: IconFileAnalytics,
      gradient: "from-blue-500/10 to-indigo-500/5",
      iconWrap: "bg-blue-500/10 text-blue-600",
      accent: "bg-blue-500"
    },
    {
      label: "Delete Actions",
      value: auditLogs.filter(log => log.action?.includes('DELETE')).length,
      icon: IconAlertTriangle,
      gradient: "from-rose-500/10 to-red-500/5",
      iconWrap: "bg-rose-500/10 text-rose-600",
      accent: "bg-rose-500"
    },
    {
      label: "Login Actions",
      value: auditLogs.filter(log => log.action?.includes('LOGIN')).length,
      icon: IconExclamationMark,
      gradient: "from-amber-500/10 to-yellow-500/5",
      iconWrap: "bg-amber-500/10 text-amber-600",
      accent: "bg-amber-500"
    },
    {
      label: "Unique Users",
      value: new Set(auditLogs.filter(log => log.user).map(log => log.user._id)).size,
      icon: IconUser,
      gradient: "from-emerald-500/10 to-teal-500/5",
      iconWrap: "bg-emerald-500/10 text-emerald-600",
      accent: "bg-emerald-500"
    }
  ];

  const LogDetailModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f9fafb] to-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <IconFileAnalytics className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[#111827]">Audit Log Details</h3>
          </div>
          <button
            onClick={() => setShowLogDetail(false)}
            className="text-[#9ca3af] hover:text-[#4b5563] hover:bg-[#f3f4f6] rounded-full p-1.5 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {selectedLog && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 rounded-lg border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af] mb-1">
                  <IconTag className="w-3.5 h-3.5" />
                  Action
                </div>
                <div className="flex items-center gap-2">
                  {React.createElement(getActionIcon(selectedLog.action), { className: "w-4 h-4 text-[#2563eb] flex-shrink-0" })}
                  <span className="font-medium text-sm text-[#111827] break-words">{selectedLog.action}</span>
                </div>
              </div>
              <div className="rounded-lg border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af] mb-1">Severity</div>
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md ${getSeverityStyles(selectedLog.severity || 'low')}`}>
                  {(selectedLog.severity || 'LOW').toUpperCase()}
                </span>
              </div>
              <div className="rounded-lg border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af] mb-1">Status</div>
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md ${getStatusStyles(selectedLog.status || 'success')}`}>
                  {(selectedLog.status || 'SUCCESS').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={IconClock} label="Date & Time" value={new Date(selectedLog.createdAt).toLocaleString()} />
              <InfoField icon={IconMapPin} label="IP Address" value={selectedLog.ip} mono />
            </div>

            {/* User Info */}
            {selectedLog.user && (
              <div className="rounded-lg border border-[#eef0f2] bg-[#f9fafb] p-4">
                <h4 className="font-medium text-[#111827] mb-3 flex items-center gap-2">
                  <IconUser className="w-4 h-4 text-[#6b7280]" />
                  User Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <InfoField label="Name" value={selectedLog.user.fullName} />
                  <InfoField label="Email" value={selectedLog.user.email} />
                  <InfoField label="Role" value={selectedLog.user.role} />
                  <InfoField label="User ID" value={selectedLog.user._id} mono />
                </div>
              </div>
            )}

            {/* Resource Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField label="Resource Type" value={selectedLog.resourceType} />
              <InfoField label="Resource ID" value={selectedLog.resourceId} mono />
            </div>

            {/* Network Info */}
            <div>
              <InfoField icon={IconDeviceDesktop} label="User Agent" value={selectedLog.userAgent} mono />
            </div>

            {/* Details */}
            <div>
              <h4 className="font-medium text-[#111827] mb-3">Additional Details</h4>
              <div className="audit-detail-scroll bg-[#0f172a] rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto border border-[#1e293b]">
                <pre className="text-xs sm:text-sm text-[#e2e8f0] whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-[#e5e7eb]">
              <button
                onClick={() => setShowLogDetail(false)}
                className="px-4 py-2 text-[#374151] bg-[#f3f4f6] rounded-md hover:bg-[#e5e7eb] transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {/* Export single log */ }}
                className="px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] transition-colors"
              >
                Export Log
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <style>{`
        .audit-detail-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .audit-detail-scroll::-webkit-scrollbar-track { background: #0f172a; }
        .audit-detail-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 9999px; }
        .audit-detail-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">System Audit Logs</h1>
          <p className="text-sm sm:text-base text-[#4b5563] mt-1">
            Monitor and track all system activities and security events
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-80`} />
            <div className={`absolute top-0 left-0 h-1 w-full ${card.accent}`} />
            <div className="relative flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-[#6b7280] truncate">{card.label}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#111827] mt-1">{card.value}</p>
              </div>
              <div className={`flex-shrink-0 rounded-lg p-2 sm:p-3 ${card.iconWrap}`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#e5e7eb] bg-[#f9fafb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg transition-colors text-xs sm:text-sm font-medium ${showFilters ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]'
                }`}
            >
              <IconFilter className="w-4 h-4" />
              <span>Filters</span>
              <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => refetch()}
              title="Refresh"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-[#f3f4f6] text-[#374151] rounded-lg hover:bg-[#e5e7eb] transition-colors text-xs sm:text-sm font-medium"
            >
              <IconRefresh className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportLogs}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] transition-colors text-xs sm:text-sm font-medium"
            >
              <IconDownload className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <div className={`grid transition-all duration-300 ease-in-out ${showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="border-t border-[#e5e7eb] bg-[#fafbfc] p-4 sm:p-5 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2">
                  <IconCalendar className="w-3.5 h-3.5" />
                  Time Range
                </div>
                <div className="flex flex-wrap gap-2">
                  {timeRangeOptions.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setDateRange(range.value)}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${dateRange === range.value
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
                        }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="">All Actions</option>
                    <option value="LOGIN_ATTEMPT">Login Attempt</option>
                    <option value="LOGIN_FAILED">Login Failed</option>
                    <option value="DELETE_USER">Delete User</option>
                    <option value="CREATE_USER">Create User</option>
                    <option value="UPDATE_USER">Update User</option>
                    <option value="SYSTEM_BACKUP">System Backup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Severity</label>
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="">All Severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-[#374151] mb-2">User</label>
                  <input
                    type="text"
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                    placeholder="User ID or email"
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb]">
        {/* Mobile Card View */}
        <div className="block md:hidden">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-[#dc2626]">
                Error loading audit logs: {error?.data?.message || error?.message}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <IconFileAnalytics className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#111827]">No Audit Logs</h3>
                <p className="text-[#6b7280]">No audit logs found for the selected criteria.</p>
              </div>
            ) : (
              auditLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <div key={log._id} className="bg-[#f9fafb] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ActionIcon className="w-4 h-4 text-[#6b7280]" />
                        <span className="text-sm font-medium text-[#111827]">{log.action}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogDetail(true);
                        }}
                        className="text-[#2563eb] hover:text-[#1e40af] hover:scale-110 transition-transform"
                      >
                        <IconEye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {log.user ? (
                          <>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${getAvatarColor(log.user.fullName)}`}>
                              {getInitials(log.user.fullName)}
                            </div>
                            <span className="text-sm text-[#111827]">{log.user.fullName}</span>
                          </>
                        ) : (
                          <>
                            <div className="h-6 w-6 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                              <IconShield className="w-3 h-3 text-[#6b7280]" />
                            </div>
                            <span className="text-sm text-[#111827]">System</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getSeverityStyles(log.severity || 'low')}`}>
                          {(log.severity || 'LOW').toUpperCase()}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getStatusStyles(log.status || 'success')}`}>
                          {(log.status || 'SUCCESS').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        {log.resourceType || 'System'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb]">
              <tr>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  <button
                    onClick={() => {
                      setSortBy("createdAt");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                    className="flex items-center space-x-1 hover:text-[#374151]"
                  >
                    <span>Date & Time</span>
                    {sortBy === "createdAt" && (
                      sortOrder === "asc" ? <IconArrowUp className="w-3 h-3" /> : <IconArrowDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  User
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Action
                </th>
                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Target
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Severity
                </th>
                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#ffffff] divide-y divide-[#e5e7eb]">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="text-[#dc2626]">
                      Error loading audit logs: {error?.data?.message || error?.message}
                    </div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <IconFileAnalytics className="w-12 h-12 text-[#9ca3af] mb-4" />
                      <h3 className="text-lg font-medium text-[#111827]">No Audit Logs</h3>
                      <p className="text-[#6b7280]">No audit logs found for the selected criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  return (
                    <tr key={log._id} className="hover:bg-[#f9fafb] transition-colors duration-150">
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-[#111827]">
                          <IconClock className="w-3.5 h-3.5 text-[#9ca3af] flex-shrink-0" />
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[#6b7280] ml-5">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        {log.user ? (
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-7 lg:h-8 w-7 lg:w-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(log.user.fullName)}`}>
                              {getInitials(log.user.fullName)}
                            </div>
                            <div className="ml-2 lg:ml-3 min-w-0 max-w-[120px] lg:max-w-[160px]">
                              <div className="text-xs lg:text-sm font-medium text-[#111827] truncate" title={log.user.fullName}>{log.user.fullName}</div>
                              <div className="text-xs text-[#6b7280] truncate">{log.user.role}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-7 lg:h-8 w-7 lg:w-8">
                              <div className="h-7 lg:h-8 w-7 lg:w-8 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                                <IconShield className="w-3 lg:w-4 h-3 lg:h-4 text-[#6b7280]" />
                              </div>
                            </div>
                            <div className="ml-2 lg:ml-3">
                              <div className="text-xs lg:text-sm font-medium text-[#111827]">System</div>
                              <div className="text-xs text-[#6b7280]">Automated</div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 lg:px-6 py-4 max-w-[140px] lg:max-w-[200px]">
                        <div className="flex items-center space-x-1 lg:space-x-2" title={log.action}>
                          <ActionIcon className="w-3 lg:w-4 h-3 lg:h-4 text-[#6b7280] flex-shrink-0" />
                          <span className="text-xs lg:text-sm font-medium text-[#111827] truncate">{log.action}</span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 max-w-[160px]">
                        <div className="text-sm text-[#111827] truncate">{log.resourceType || 'System'}</div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <span className={`inline-flex px-1.5 lg:px-2.5 py-1 text-xs font-semibold rounded-md ${getSeverityStyles(log.severity || 'low')}`}>
                          <span className="hidden lg:inline">{(log.severity || 'LOW').toUpperCase()}</span>
                          <span className="lg:hidden">{(log.severity || 'L')[0]}</span>
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md ${getStatusStyles(log.status || 'success')}`}>
                          {(log.status || 'SUCCESS').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowLogDetail(true);
                          }}
                          className="text-[#2563eb] hover:text-[#1e40af] hover:bg-blue-50 rounded-full p-1.5 hover:scale-110 transition-all duration-150 inline-flex"
                          title="View Details"
                        >
                          <IconEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-4 border-t border-[#e5e7eb]">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="text-xs sm:text-sm text-[#374151]">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalLogs)} of {totalLogs} logs
            </div>
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-[#d1d5db] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f9fafb]"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">←</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md ${currentPage === page
                      ? 'bg-[#2563eb] text-[#ffffff] border-[#2563eb]'
                      : 'border-[#d1d5db] hover:bg-[#f9fafb]'
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-[#d1d5db] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f9fafb]"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLogDetail && <LogDetailModal />}
    </div>
  );
};

export default SystemAuditLogs;
