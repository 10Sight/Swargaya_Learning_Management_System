import React, { useState, useMemo } from 'react';
import {
  IconX,
  IconUsersGroup,
  IconSearch,
  IconLoader,
  IconUser,
  IconMail,
  IconShield,
  IconCheck,
  IconFilter
} from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { useBulkAssignRolesMutation } from '@/Redux/AllApi/SuperAdminApi';

const BulkAssignRoles = ({ open, onClose, roles, users, onSuccess }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [bulkAssignRoles, { isLoading }] = useBulkAssignRolesMutation();

  // Filter users based on search term and role filter
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName?.toLowerCase().includes(lowerSearchTerm) ||
        user.userName?.toLowerCase().includes(lowerSearchTerm) ||
        user.email?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    return filtered;
  }, [users, searchTerm, roleFilter]);

  const handleUserToggle = (user) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    try {
      await bulkAssignRoles({
        userIds: selectedUsers.map(user => user.id),
        roleId: selectedRole
      }).unwrap();

      toast.success(`Role assigned to ${selectedUsers.length} users successfully`);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to assign roles');
    }
  };

  const resetForm = () => {
    setSelectedUsers([]);
    setSelectedRole('');
    setSearchTerm('');
    setRoleFilter('');
  };

  const getRoleColor = (roleName) => {
    const colors = {
      'SUPERADMIN': 'bg-[#fee2e2] text-[#b91c1c]',
      'ADMIN': 'bg-[#dbeafe] text-[#1d4ed8]',
      'INSTRUCTOR': 'bg-[#dcfce7] text-[#15803d]',
      'STUDENT': 'bg-[#fef9c3] text-[#a16207]',
      default: 'bg-[#f3e8ff] text-[#7e22ce]'
    };
    return colors[roleName] || colors.default;
  };

  const uniqueRoles = [...new Set(users.map(user => user.role))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1300] p-4 text-left">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#f3e8ff] rounded-lg">
              <IconUsersGroup size={24} className="text-[#9333ea]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#111827]">Bulk Assign Roles</h2>
              <p className="text-sm text-[#4b5563]">Assign roles to multiple users at once</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 text-[#9ca3af] hover:text-[#4b5563] hover:bg-[#f3f4f6] rounded-lg transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  placeholder="Search users by name or email..."
                />
              </div>

              {/* Role Filter */}
              <div className="relative">
                <IconFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={20} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent appearance-none"
                >
                  <option value="">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* User Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#111827]">Select Users</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-[#4b5563]">
                    {selectedUsers.length} of {filteredUsers.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                  >
                    {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="max-h-64 overflow-y-auto border border-[#e5e7eb] rounded-lg">
                {filteredUsers.length > 0 ? (
                  <div className="divide-y divide-[#e5e7eb]">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center space-x-3 p-4 cursor-pointer hover:bg-[#f9fafb] ${selectedUsers.find(u => u.id === user.id) ? 'bg-[#eff6ff]' : ''
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedUsers.find(u => u.id === user.id)}
                          onChange={() => handleUserToggle(user)}
                          className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#3b82f6]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[#111827] truncate">
                                {user.fullName || user.userName}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <IconMail className="text-[#9ca3af]" size={14} />
                                <p className="text-sm text-[#4b5563] truncate">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                              <div className="w-8 h-8 rounded-full bg-[#e5e7eb] flex items-center justify-center">
                                <IconUser className="text-[#6b7280]" size={16} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-[#6b7280]">
                    No users found matching your filters
                  </div>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#111827]">Select Target Role</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedRole === role.id
                      ? 'border-[#3b82f6] bg-[#eff6ff]'
                      : 'border-[#e5e7eb] hover:border-[#d1d5db] hover:bg-[#f9fafb]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="selectedRole"
                      value={role.id}
                      checked={selectedRole === role.id}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-[#3b82f6]"
                    />
                    <div className="flex items-center space-x-2">
                      <IconShield className="text-[#6b7280]" size={20} />
                      <div>
                        <p className="font-medium text-[#111827]">{role.name}</p>
                        {role.description && (
                          <p className="text-sm text-[#4b5563] mt-1">{role.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>
                            {role.isSystemRole ? 'System Role' : 'Custom Role'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedUsers.length > 0 && selectedRole && (
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-4">
                <h4 className="font-medium text-[#1e3a8a] mb-2">Assignment Summary</h4>
                <p className="text-[#1e40af]">
                  You are about to assign the role <strong>{roles.find(r => r.id === selectedRole)?.name}</strong> to{' '}
                  <strong>{selectedUsers.length}</strong> user{selectedUsers.length !== 1 ? 's' : ''}.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedUsers.slice(0, 5).map((user) => (
                    <span
                      key={user.id}
                      className="px-2 py-1 bg-[#bfdbfe] text-[#1e40af] text-xs rounded-md"
                    >
                      {user.fullName || user.userName}
                    </span>
                  ))}
                  {selectedUsers.length > 5 && (
                    <span className="px-2 py-1 bg-[#93c5fd] text-[#1e3a8a] text-xs rounded-md">
                      +{selectedUsers.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#e5e7eb] bg-[#f9fafb]">
            <div className="text-sm text-[#4b5563]">
              {selectedUsers.length > 0 && selectedRole ? (
                <span>Ready to assign role to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}</span>
              ) : (
                <span>Please select users and a target role</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 text-[#374151] bg-white border border-[#d1d5db] rounded-lg hover:bg-[#f9fafb] transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || selectedUsers.length === 0 || !selectedRole}
                className="px-4 py-2 bg-[#9333ea] text-[#ffffff] rounded-lg hover:bg-[#7e22ce] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <IconLoader className="animate-spin" size={16} />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <IconUsersGroup size={16} />
                    <span>Assign to {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAssignRoles;
