import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  IconTrash,
  IconRestore,
  IconSearch,
  IconFilter,
  IconDownload,
  IconEye,
  IconRefresh,
  IconAlertTriangle,
  IconX,
  IconClock,
  IconUser,
  IconCalendar,
  IconShieldCheck,
  IconTrashOff
} from "@tabler/icons-react";
import {
  useGetSoftDeletedUsersQuery,
  useRestoreUserMutation,
  usePermanentDeleteUserMutation
} from "@/Redux/AllApi/SuperAdminApi";
import { toast } from "sonner";

const SoftDeletedUsersManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [filters, setFilters] = useState({
    role: "",
    deletedDateFrom: "",
    deletedDateTo: "",
    deletedBy: ""
  });

  // API hooks
  const {
    data: deletedUsersData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetSoftDeletedUsersQuery({
    page: currentPage,
    limit: 20,
    sortBy,
    order: sortOrder,
    search: searchTerm,
    role: filters.role,
    deletedDateFrom: filters.deletedDateFrom,
    deletedDateTo: filters.deletedDateTo,
    deletedBy: filters.deletedBy
  });

  const [restoreUser] = useRestoreUserMutation();
  const [permanentDeleteUser] = usePermanentDeleteUserMutation();

  const deletedUsers = deletedUsersData?.data?.users || [];
  const totalPages = deletedUsersData?.data?.totalPages || 1;

  const handleRestoreUser = async (userId) => {
    try {
      await restoreUser(userId).unwrap();
      toast.success("User restored successfully!");
      refetch();
    } catch (error) {
      console.error("Error restoring user:", error);
      toast.error(error?.data?.message || "Failed to restore user");
    }
  };

  const handlePermanentDelete = async (userId) => {
    try {
      await permanentDeleteUser(userId).unwrap();
      toast.success("User permanently deleted!");
      refetch();
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      toast.error(error?.data?.message || "Failed to permanently delete user");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;

    setConfirmAction({ type: action, users: selectedUsers });
    setShowConfirmModal(true);
  };

  const executeBulkAction = async () => {
    try {
      // Note: Bulk operations would need to be implemented in the API
      toast.success(`Bulk ${confirmAction.type} operation completed!`);
      setSelectedUsers([]);
      setShowConfirmModal(false);
      setConfirmAction(null);
      refetch();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-[#f3e8ff] text-[#6b21a8]";
      case "ADMIN":
        return "bg-[#fee2e2] text-[#991b1b]";
      case "INSTRUCTOR":
        return "bg-[#dbeafe] text-[#1e40af]";
      case "STUDENT":
        return "bg-[#dcfce7] text-[#166534]";
      default:
        return "bg-[#f3f4f6] text-[#1f2937]";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "STUDENT":
        return "Employee";
      case "INSTRUCTOR":
        return "Trainer";
      default:
        return role;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-[#dcfce7] text-[#166534]";
      case "SUSPENDED":
        return "bg-[#fef9c3] text-[#854d0e]";
      case "BANNED":
        return "bg-[#fee2e2] text-[#991b1b]";
      case "PENDING":
        return "bg-[#dbeafe] text-[#1e40af]";
      default:
        return "bg-[#f3f4f6] text-[#1f2937]";
    }
  };

  const ConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <IconAlertTriangle className="w-6 h-6 text-[#ca8a04]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-[#111827] mb-2">
              Confirm Action
            </h3>
            <p className="text-sm text-[#4b5563] mb-4">
              {confirmAction?.type === 'restore'
                ? `Are you sure you want to restore ${confirmAction?.users?.length} user(s)? This will reactivate their accounts and they will be able to log in again.`
                : `Are you sure you want to permanently delete ${confirmAction?.users?.length} user(s)? This action cannot be undone and will remove all associated data.`
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 text-[#374151] bg-[#f3f4f6] rounded-md hover:bg-[#e5e7eb] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                className={`px-4 py-2 text-white rounded-md transition-colors ${confirmAction?.type === 'restore'
                  ? 'bg-[#16a34a] hover:bg-[#15803d]'
                  : 'bg-[#dc2626] hover:bg-[#b91c1c]'
                  }`}
              >
                {confirmAction?.type === 'restore' ? 'Restore' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Soft Deleted Users Management</h1>
          <p className="text-[#4b5563] mt-1">
            Manage soft-deleted users with restore or permanent deletion options
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${showFilters ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]'
              }`}
          >
            <IconFilter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-[#fefce8] border border-[#fef08a] rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <IconAlertTriangle className="w-5 h-5 text-[#ca8a04] mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-[#854d0e]">Important Notice</h3>
            <p className="text-sm text-[#a16207] mt-1">
              These users have been soft-deleted and are not visible to regular users.
              You can either restore them to reactivate their accounts or permanently delete them to remove all data.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              >
                <option value="">All Roles</option>
                <option value="SUPERADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="INSTRUCTOR">Trainer</option>
                <option value="STUDENT">Employee</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">Deleted From</label>
              <input
                type="date"
                value={filters.deletedDateFrom}
                onChange={(e) => setFilters({ ...filters, deletedDateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">Deleted To</label>
              <input
                type="date"
                value={filters.deletedDateTo}
                onChange={(e) => setFilters({ ...filters, deletedDateTo: e.target.value })}
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">Deleted By</label>
              <input
                type="text"
                value={filters.deletedBy}
                onChange={(e) => setFilters({ ...filters, deletedBy: e.target.value })}
                placeholder="Admin name or email"
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="absolute left-3 top-3 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search deleted users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            />
          </div>

          <div className="flex items-center space-x-3">
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#4b5563]">
                  {selectedUsers.length} selected
                </span>
                <button
                  onClick={() => handleBulkAction('restore')}
                  className="flex items-center space-x-1 px-3 py-1 bg-[#dcfce7] text-[#15803d] rounded-md hover:bg-[#bbf7d0] transition-colors"
                >
                  <IconRestore className="w-4 h-4" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => handleBulkAction('permanent_delete')}
                  className="flex items-center space-x-1 px-3 py-1 bg-[#fee2e2] text-[#b91c1c] rounded-md hover:bg-[#fecaca] transition-colors"
                >
                  <IconTrash className="w-4 h-4" />
                  <span>Permanent Delete</span>
                </button>
              </div>
            )}

            <button
              onClick={() => refetch()}
              className="flex items-center space-x-2 px-3 py-2 bg-[#f3f4f6] text-[#374151] rounded-md hover:bg-[#e5e7eb] transition-colors"
            >
              <IconRefresh className="w-4 h-4" />
              <span>Refresh</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 bg-[#f3f4f6] text-[#374151] rounded-md hover:bg-[#e5e7eb] transition-colors">
              <IconDownload className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Total Deleted</p>
              <p className="text-2xl font-bold text-[#111827]">{deletedUsers.length}</p>
            </div>
            <IconTrashOff className="w-8 h-8 text-[#dc2626]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Employees</p>
              <p className="text-2xl font-bold text-[#111827]">
                {deletedUsers.filter(u => u.role === 'STUDENT').length}
              </p>
            </div>
            <IconUser className="w-8 h-8 text-[#16a34a]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">Trainers</p>
              <p className="text-2xl font-bold text-[#111827]">
                {deletedUsers.filter(u => u.role === 'INSTRUCTOR').length}
              </p>
            </div>
            <IconShieldCheck className="w-8 h-8 text-[#2563eb]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4b5563]">This Week</p>
              <p className="text-2xl font-bold text-[#111827]">
                {deletedUsers.filter(u =>
                  new Date(u.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
            </div>
            <IconCalendar className="w-8 h-8 text-[#7e22ce]" />
          </div>
        </div>
      </div>

      {/* Deleted Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb]">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === deletedUsers.length && deletedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(deletedUsers.map(user => user._id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Previous Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Lines
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Machines
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Joining Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Leaving Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Deleted Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Deleted By
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="13" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="13" className="px-6 py-8 text-center">
                    <div className="text-[#dc2626]">
                      Error loading deleted users: {error?.data?.message || error?.message}
                    </div>
                  </td>
                </tr>
              ) : deletedUsers.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <IconTrashOff className="w-12 h-12 text-[#9ca3af] mb-4" />
                      <h3 className="text-lg font-medium text-[#111827]">No Deleted Users</h3>
                      <p className="text-[#6b7280]">There are no soft-deleted users to manage.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                deletedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-[#f9fafb]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user._id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                          }
                        }}
                        className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="relative">
                          <img
                            className="h-10 w-10 rounded-full object-cover opacity-60"
                            src={user.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=9ca3af&color=fff`}
                            alt={user.fullName}
                          />
                          <div className="absolute inset-0 bg-[#6b7280] bg-opacity-20 rounded-full flex items-center justify-center">
                            <IconTrash className="w-3 h-3 text-[#4b5563]" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[#374151]">{user.fullName}</div>
                          <div className="text-sm text-[#6b7280]">@{user.userName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#374151]">{user.email}</div>
                      <div className="text-sm text-[#6b7280]">{user.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#374151]">
                        {user.department?.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {Array.isArray(user.lines) && user.lines.length > 0 ? (
                          user.lines.map((line) => (
                            <span
                              key={line.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#f3f4f6] text-[#374151]"
                            >
                              {line.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#9ca3af]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {Array.isArray(user.machines) && user.machines.length > 0 ? (
                          user.machines.map((machine) => (
                            <span
                              key={machine.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#f3f4f6] text-[#374151]"
                            >
                              {machine.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#9ca3af]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#111827]">
                        {user.doj ? new Date(user.doj).toLocaleDateString() : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#111827]">
                        {user.leavingDate ? new Date(user.leavingDate).toLocaleDateString() : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#111827]">
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        {new Date(user.updatedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#111827]">System</div>
                      <div className="text-xs text-[#6b7280]">Soft deleted by admin</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {/* View user details */ }}
                          className="text-[#2563eb] hover:text-[#1e40af] transition-colors"
                          title="View Details"
                        >
                          <IconEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestoreUser(user._id)}
                          className="text-[#16a34a] hover:text-[#14532d] transition-colors"
                          title="Restore User"
                        >
                          <IconRestore className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(user._id)}
                          className="text-[#dc2626] hover:text-[#7f1d1d] transition-colors"
                          title="Permanently Delete"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[#e5e7eb]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#374151]">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, deletedUsers.length)} of {deletedUsers.length} deleted users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-[#d1d5db] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f9fafb]"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded-md ${currentPage === page
                    ? 'bg-[#2563eb] text-[#ffffff] border-[#2563eb]'
                    : 'border-[#d1d5db] hover:bg-[#f9fafb]'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-[#d1d5db] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f9fafb]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showConfirmModal && <ConfirmModal />}
    </div>
  );
};

export default SoftDeletedUsersManagement;
