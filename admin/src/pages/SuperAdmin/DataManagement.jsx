import React, { useState } from "react";
import {
  useGetBackupHistoryQuery,
  useRestoreFromBackupMutation,
  useGetDataStatisticsQuery,
  useGetDataOperationHistoryQuery
} from "../../Redux/AllApi/SuperAdminApi";
import {
  Download,
  Upload,
  RefreshCcw,
  Archive,
  AlertTriangle,
  Clock,
  HardDrive,
  BarChart3,
  FileText,
  Users,
  BookOpen,
  Award,
  Activity,
  TrendingUp
} from "lucide-react";
import { toast } from "react-hot-toast";

const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);

  // API Hooks
  const [restoreBackup, { isLoading: restoring }] = useRestoreFromBackupMutation();

  // Data Queries
  const { data: backupHistory, isLoading: loadingBackups, refetch: refetchBackups } = useGetBackupHistoryQuery({
    page: 1,
    limit: 10
  });
  const { data: dataStats, refetch: refetchStats } = useGetDataStatisticsQuery();
  const { data: operationHistory } = useGetDataOperationHistoryQuery({
    page: 1,
    limit: 10
  });

  // Collections shown on the Overview stat cards
  const availableCollections = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'departments', label: 'Departments', icon: Users },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'quizzes', label: 'Quizzes', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'audits', label: 'Audit Logs', icon: Activity }
  ];

  // Restore from backup
  const handleRestoreBackup = async (backupId) => {
    try {
      await restoreBackup({ backupId, confirmRestore: true }).unwrap();
      toast.success('Backup restored successfully');
      setShowRestoreConfirm(null);
      refetchStats();
      refetchBackups();
    } catch (error) {
      toast.error(error.data?.message || 'Failed to restore backup');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get operation status icon
  const getOperationStatusIcon = (action) => {
    switch (action) {
      case 'CREATE_BACKUP':
        return <Archive className="h-4 w-4 text-[#2563eb]" />;
      case 'RESTORE_BACKUP':
        return <RefreshCcw className="h-4 w-4 text-[#16a34a]" />;
      case 'EXPORT_DATA':
        return <Download className="h-4 w-4 text-[#9333ea]" />;
      case 'IMPORT_DATA':
        return <Upload className="h-4 w-4 text-[#ea580c]" />;
      default:
        return <Activity className="h-4 w-4 text-[#4b5563]" />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'backups', label: 'Backups', icon: Archive },
    { id: 'operations', label: 'Operation History', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Data Management</h1>
          <p className="text-[#4b5563] mt-1">
            Database backup restore and operation history
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchStats();
              refetchBackups();
            }}
            className="inline-flex items-center px-4 py-2 bg-[#f3f4f6] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#e5e7eb] transition-colors"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e5e7eb]">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-[#6366f1] text-[#4f46e5]'
                  : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:border-[#d1d5db]'
                  }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Data Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dataStats?.data?.statistics && Object.entries(dataStats.data.statistics).map(([key, stats]) => {
                const collection = availableCollections.find(c => c.id === key);
                const Icon = collection?.icon || HardDrive;
                return (
                  <div key={key} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#4b5563] capitalize">{key}</p>
                        <p className="text-2xl font-bold text-[#111827]">
                          {stats.total.toLocaleString()}
                        </p>
                        <p className="text-sm text-[#6b7280]">
                          {stats.recent} recent
                        </p>
                      </div>
                      <div className="p-3 bg-[#dbeafe] rounded-full">
                        <Icon className="h-6 w-6 text-[#2563eb]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System Summary */}
            {dataStats?.data?.summary && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-[#111827]">System Summary</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#4f46e5]">
                      {dataStats.data.summary.totalCollections}
                    </p>
                    <p className="text-sm text-[#4b5563] mt-1">Total Collections</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#16a34a]">
                      {dataStats.data.summary.totalRecords.toLocaleString()}
                    </p>
                    <p className="text-sm text-[#4b5563] mt-1">Total Records</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#9333ea]">
                      {formatFileSize(dataStats.data.summary.estimatedSize)}
                    </p>
                    <p className="text-sm text-[#4b5563] mt-1">Estimated Size</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'backups' && (
          <div className="space-y-6">
            {/* Backup History */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-[#111827]">Backup History</h3>
                <p className="text-sm text-[#4b5563] mt-1">
                  Daily database backups from C:\MMLIBackup
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#f9fafb]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Backup File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backupHistory?.data?.backups?.map((backup) => (
                      <tr key={backup._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#111827]">
                          {backup.backup?.id || backup._id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6b7280]">
                          {formatDate(backup.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6b7280]">
                          {backup.backup?.size ? formatFileSize(backup.backup.size) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setShowRestoreConfirm(backup.backup?.id || backup._id)}
                            className="text-[#4f46e5] hover:text-indigo-900"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loadingBackups && (!backupHistory?.data?.backups || backupHistory.data.backups.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-[#6b7280]">
                          No backup files found in C:\MMLIBackup
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-[#111827]">Operation History</h3>
              <p className="text-sm text-[#4b5563] mt-1">
                Recent data management operations
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operationHistory?.data?.operations?.map((operation) => (
                    <tr key={operation._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getOperationStatusIcon(operation.action)}
                          <span className="ml-2 text-sm font-medium text-[#111827]">
                            {operation.action.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6b7280]">
                        {operation.userId?.fullName || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6b7280]">
                        {formatDate(operation.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6b7280]">
                        {operation.details?.description ||
                          operation.details?.collections?.join(', ') ||
                          'No details available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-[#ca8a04] mr-3" />
              <h3 className="text-lg font-semibold text-[#111827]">Confirm Restore</h3>
            </div>
            <p className="text-[#4b5563] mb-6">
              This action will replace all current data with the backup data and drop active connections.
              This cannot be undone. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="px-4 py-2 text-[#374151] bg-[#f3f4f6] rounded-lg hover:bg-[#e5e7eb]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestoreBackup(showRestoreConfirm)}
                disabled={restoring}
                className="px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
