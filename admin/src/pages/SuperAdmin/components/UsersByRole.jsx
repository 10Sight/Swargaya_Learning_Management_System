import React, { useState, useMemo } from 'react';
import {
  IconSearch,
  IconFilter,
  IconUser,
  IconMail,
  IconCalendar,
  IconShield,
  IconChevronDown,
  IconChevronUp,
  IconUsers,
  IconLoader
} from '@tabler/icons-react';
import { useGetUsersByRoleQuery } from '@/Redux/AllApi/SuperAdminApi';

const UsersByRole = ({ selectedRole, roles, onRoleSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch users for the selected role
  const {
    data: usersData,
    isLoading,
    error
  } = useGetUsersByRoleQuery(
    { roleId: selectedRole?.id, limit: 1000 },
    { skip: !selectedRole }
  );

  const users = usersData?.data?.users || [];

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName?.toLowerCase().includes(lowerSearchTerm) ||
        user.userName?.toLowerCase().includes(lowerSearchTerm) ||
        user.email?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = (a.fullName || a.userName || '').toLowerCase();
          bValue = (b.fullName || b.userName || '').toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (roleName) => {
    const colors = {
      'SUPERADMIN': 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]',
      'ADMIN': 'bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]',
      'INSTRUCTOR': 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
      'STUDENT': 'bg-[#fef9c3] text-[#a16207] border-[#fef08a]',
      default: 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]'
    };
    return colors[roleName] || colors.default;
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-[#374151] hover:text-[#111827]"
    >
      <span>{children}</span>
      {sortBy === field && (
        sortOrder === 'asc' ?
          <IconChevronUp size={16} /> :
          <IconChevronDown size={16} />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Role Selector */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[#111827]">Select Role</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => {
                onRoleSelect(role);
                setCurrentPage(1);
                setSearchTerm('');
              }}
              className={`p-4 rounded-lg border text-left transition-colors ${selectedRole?.id === role.id
                ? 'border-[#3b82f6] bg-[#eff6ff]'
                : 'border-[#e5e7eb] hover:border-[#d1d5db] hover:bg-[#f9fafb]'
                }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <IconShield size={18} className="text-[#6b7280]" />
                <span className="font-medium text-[#111827]">{role.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <IconUsers size={14} className="text-[#9ca3af]" />
                <span className="text-[#4b5563]">{role.userCount || 0} users</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {selectedRole && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[#111827]">
              Users with role: {selectedRole.name}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(selectedRole.name)}`}>
              {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                placeholder="Search users by name or email..."
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <IconLoader className="animate-spin mx-auto mb-4 text-[#2563eb]" size={40} />
                <p className="text-[#4b5563]">Loading users...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-4">
              <p className="text-[#b91c1c]">
                Failed to load users: {error.message}
              </p>
            </div>
          )}

          {/* Users Table */}
          {!isLoading && !error && (
            <>
              <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#e5e7eb]">
                    <thead className="bg-[#f9fafb]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                          <SortButton field="name">User</SortButton>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                          <SortButton field="email">Email</SortButton>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                          <SortButton field="createdAt">Joined</SortButton>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#e5e7eb]">
                      {paginatedUsers.length > 0 ? (
                        paginatedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-[#f9fafb]">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-[#e5e7eb] flex items-center justify-center mr-3">
                                  <IconUser className="text-[#6b7280]" size={20} />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-[#111827]">
                                    {user.fullName || user.userName}
                                  </div>
                                  <div className="text-sm text-[#6b7280]">
                                    @{user.userName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-[#111827]">
                                <IconMail className="mr-2 text-[#9ca3af]" size={16} />
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-[#111827]">
                                <IconCalendar className="mr-2 text-[#9ca3af]" size={16} />
                                {formatDate(user.createdAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive
                                ? 'bg-[#dcfce7] text-[#166534]'
                                : 'bg-[#fee2e2] text-[#991b1b]'
                                }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="text-[#6b7280]">
                              {searchTerm ? (
                                <>
                                  <IconSearch className="mx-auto mb-2 text-[#9ca3af]" size={24} />
                                  <p>No users found matching "{searchTerm}"</p>
                                </>
                              ) : (
                                <>
                                  <IconUsers className="mx-auto mb-2 text-[#9ca3af]" size={24} />
                                  <p>No users assigned to this role yet</p>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#374151]">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === pageNum
                              ? 'bg-[#2563eb] text-[#ffffff]'
                              : 'text-[#374151] bg-[#ffffff] border border-[#d1d5db] hover:bg-[#f9fafb]'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!selectedRole && (
        <div className="text-center py-12">
          <IconUsers className="mx-auto mb-4 text-[#9ca3af]" size={48} />
          <h3 className="text-lg font-medium text-[#111827] mb-2">Select a Role</h3>
          <p className="text-[#4b5563]">Choose a role from the list above to view its assigned users.</p>
        </div>
      )}
    </div>
  );
};

export default UsersByRole;
