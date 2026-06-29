import React, { useState, useMemo } from 'react';
import {
  IconCheck,
  IconX,
  IconSearch,
  IconFilter,
  IconDownload,
  IconMatrix,
  IconShield,
  IconLock,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';

const PermissionMatrix = ({ roles, permissions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [showCustomRoles, setShowCustomRoles] = useState(true);

  // Filter roles based on filters
  const filteredRoles = useMemo(() => {
    let filtered = roles;

    if (!showSystemRoles) {
      filtered = filtered.filter(role => !role.isSystemRole);
    }
    if (!showCustomRoles) {
      filtered = filtered.filter(role => role.isSystemRole);
    }

    if (roleFilter) {
      filtered = filtered.filter(role =>
        role.name.toLowerCase().includes(roleFilter.toLowerCase())
      );
    }

    return filtered;
  }, [roles, showSystemRoles, showCustomRoles, roleFilter]);

  // Filter permissions based on search and category
  const filteredPermissions = useMemo(() => {
    const allPermissions = [];

    Object.entries(permissions).forEach(([category, categoryPermissions]) => {
      if (!categoryFilter || category === categoryFilter) {
        categoryPermissions.forEach(permObj => {
          // permObj is expected to be { id, name, description }
          // We can match against name or id
          const permName = permObj.name || permObj.id || String(permObj);
          const permId = permObj.id || String(permObj);

          if (!searchTerm || permName.toLowerCase().includes(searchTerm.toLowerCase())) {
            allPermissions.push({ category, permission: permName, id: permId });
          }
        });
      }
    });

    return allPermissions;
  }, [permissions, searchTerm, categoryFilter]);

  // Check if a role has a specific permission
  const hasPermission = (role, permission) => {
    if (!role.permissions) return false;

    if (Array.isArray(role.permissions)) {
      return role.permissions.includes(permission);
    }

    return Object.values(role.permissions).flat().includes(permission);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRoles = filteredRoles.length;
    const totalPermissions = filteredPermissions.length;
    const permissionCoverage = {};
    const roleCoverage = {};

    // Calculate permission coverage (how many roles have each permission)
    filteredPermissions.forEach(({ permission, id }) => {
      permissionCoverage[permission] = filteredRoles.filter(role =>
        hasPermission(role, id)
      ).length;
    });

    // Calculate role coverage (how many permissions each role has)
    filteredRoles.forEach(role => {
      roleCoverage[role.id] = filteredPermissions.filter(({ id }) =>
        hasPermission(role, id)
      ).length;
    });

    return {
      totalRoles,
      totalPermissions,
      permissionCoverage,
      roleCoverage,
      avgPermissionsPerRole: totalRoles > 0
        ? Object.values(roleCoverage).reduce((sum, count) => sum + count, 0) / totalRoles
        : 0
    };
  }, [filteredRoles, filteredPermissions]);

  const getRoleColor = (roleName, isSystemRole) => {
    if (isSystemRole) {
      const colors = {
        'SUPERADMIN': 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]',
        'ADMIN': 'bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]',
        'INSTRUCTOR': 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
        'STUDENT': 'bg-[#fef9c3] text-[#a16207] border-[#fef08a]',
      };
      return colors[roleName] || 'bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]';
    }
    return 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]';
  };

  const exportMatrix = () => {
    const csvContent = [
      ['Role', 'System Role', ...filteredPermissions.map(p => p.permission)].join(','),
      ...filteredRoles.map(role => [
        role.name,
        role.isSystemRole ? 'Yes' : 'No',
        ...filteredPermissions.map(({ id }) =>
          hasPermission(role, id) ? 'Yes' : 'No'
        )
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roles-permissions-matrix.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const categoryOptions = Object.keys(permissions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-[#111827] flex items-center space-x-2">
            <IconMatrix size={24} />
            <span>Permission Matrix</span>
          </h3>
          <p className="text-[#4b5563] mt-1">
            Visual overview of role permissions across the system
          </p>
        </div>
        <button
          onClick={exportMatrix}
          className="flex items-center space-x-2 px-4 py-2 bg-[#2563eb] text-[#ffffff] rounded-lg hover:bg-[#1d4ed8] transition-colors"
        >
          <IconDownload size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#2563eb] mb-1">
            {stats.totalRoles}
          </div>
          <div className="text-sm text-[#4b5563]">Total Roles</div>
        </div>
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#16a34a] mb-1">
            {stats.totalPermissions}
          </div>
          <div className="text-sm text-[#4b5563]">Total Permissions</div>
        </div>
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#9333ea] mb-1">
            {Math.round(stats.avgPermissionsPerRole)}
          </div>
          <div className="text-sm text-[#4b5563]">Avg Permissions/Role</div>
        </div>
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#ca8a04] mb-1">
            {categoryOptions.length}
          </div>
          <div className="text-sm text-[#4b5563]">Permission Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search Permissions */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              placeholder="Search permissions..."
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <IconFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={16} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent appearance-none"
            >
              <option value="">All Categories</option>
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <IconShield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={16} />
            <input
              type="text"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              placeholder="Filter roles..."
            />
          </div>
        </div>

        {/* Role Type Toggles */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showSystemRoles}
              onChange={(e) => setShowSystemRoles(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#3b82f6]"
            />
            <span className="text-sm text-[#374151]">Show System Roles</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showCustomRoles}
              onChange={(e) => setShowCustomRoles(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#3b82f6]"
            />
            <span className="text-sm text-[#374151]">Show Custom Roles</span>
          </label>
        </div>
      </div>

      {/* Matrix Table */}
      {filteredRoles.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <IconEyeOff className="mx-auto mb-4 text-[#9ca3af]" size={48} />
          <h4 className="text-lg font-medium text-[#111827] mb-2">No Roles Match Filters</h4>
          <p className="text-[#4b5563]">
            Adjust your filters to see roles in the permission matrix.
          </p>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <IconSearch className="mx-auto mb-4 text-[#9ca3af]" size={48} />
          <h4 className="text-lg font-medium text-[#111827] mb-2">No Permissions Found</h4>
          <p className="text-[#4b5563]">
            Try adjusting your search terms or category filter.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-280px)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e5e7eb]">
              <thead className="bg-[#f9fafb]">
                <tr>
                  <th className="sticky left-0 bg-[#f9fafb] px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider border-r border-[#e5e7eb]">
                    Role
                  </th>
                  {filteredPermissions.map(({ category, permission, id }, index) => (
                    <th
                      key={`${category}-${permission}`}
                      className="h-[180px] px-2 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider align-bottom w-[60px] relative"
                      title={`${category}: ${permission} (${id})`}
                    >
                      <div className="absolute bottom-2 left-2 transform -rotate-45 origin-bottom-left w-max translate-x-1">
                        <div className="flex items-center space-x-1">
                          <span className="">{permission}</span>
                          <span className="text-[#9ca3af]">
                            ({stats.permissionCoverage[permission]})
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e5e7eb]">
                {filteredRoles.map((role) => {
                  return (
                    <tr key={role.id} className="hover:bg-[#f9fafb]">
                      <td className="sticky left-0 bg-white hover:bg-[#f9fafb] px-6 py-4 whitespace-nowrap border-r border-[#e5e7eb]">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            {role.isSystemRole && <IconLock size={14} className="text-[#9ca3af]" />}
                            <span className="font-medium text-[#111827]">{role.name}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(role.name, role.isSystemRole)}`}>
                            {role.isSystemRole ? 'System' : 'Custom'}
                          </span>
                        </div>
                      </td>
                      {filteredPermissions.map(({ permission, id }) => (
                        <td
                          key={`${role.id}-${permission}`}
                          className="px-3 py-4 whitespace-nowrap text-center"
                        >
                          {hasPermission(role, id) ? (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-[#dcfce7] rounded-full">
                              <IconCheck size={14} className="text-[#16a34a]" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-[#fee2e2] rounded-full">
                              <IconX size={14} className="text-[#ef4444]" />
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <div className="text-sm font-medium text-[#111827]">
                            {stats.roleCoverage[role.id]} / {stats.totalPermissions}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            {stats.totalPermissions > 0
                              ? Math.round((stats.roleCoverage[role.id] / stats.totalPermissions) * 100)
                              : 0
                            }%
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-[#f9fafb] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[#111827] mb-3">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-6 h-6 bg-[#dcfce7] rounded-full">
                <IconCheck size={14} className="text-[#16a34a]" />
              </div>
              <span className="text-[#374151]">Permission granted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-6 h-6 bg-[#fee2e2] rounded-full">
                <IconX size={14} className="text-[#ef4444]" />
              </div>
              <span className="text-[#374151]">Permission not granted</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <IconLock size={14} className="text-[#9ca3af]" />
              <span className="text-[#374151]">System role (protected)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#6b7280]">(n)</span>
              <span className="text-[#374151]">Number of roles with permission</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrix;
