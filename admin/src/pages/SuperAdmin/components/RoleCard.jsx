import React from 'react';
import {
  IconShield,
  IconUsers,
  IconEdit,
  IconTrash,
  IconLock,
  IconSettings,
  IconEye
} from '@tabler/icons-react';

const RoleCard = ({ role, onEdit, onDelete, onViewUsers }) => {
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

  const getPermissionCount = () => {
    if (!role.permissions) return 0;
    return Array.isArray(role.permissions)
      ? role.permissions.length
      : Object.values(role.permissions).reduce((acc, perms) => acc + perms.length, 0);
  };

  return (
    <div className="bg-white rounded-lg border border-[#e5e7eb] p-5 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#f3f4f6] rounded-lg">
            <IconShield size={20} className="text-[#4b5563]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#111827] text-lg">{role.name}</h3>
            <div className="flex items-center mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(role.name)}`}>
                {role.isSystemRole ? 'System Role' : 'Custom Role'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onViewUsers(role)}
            className="p-1.5 text-[#9ca3af] hover:text-[#2563eb] hover:bg-[#eff6ff] rounded-lg transition-colors"
            title="View Users"
          >
            <IconEye size={16} />
          </button>
          {!role.isSystemRole && (
            <>
              <button
                onClick={() => onEdit(role)}
                className="p-1.5 text-[#9ca3af] hover:text-[#16a34a] hover:bg-[#f0fdf4] rounded-lg transition-colors"
                title="Edit Role"
              >
                <IconEdit size={16} />
              </button>
              <button
                onClick={() => onDelete(role)}
                className="p-1.5 text-[#9ca3af] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-colors"
                title="Delete Role"
              >
                <IconTrash size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {role.description && (
        <p className="text-[#4b5563] text-sm mb-4 line-clamp-2">
          {role.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-[#f3f4f6]">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <IconUsers size={16} className="text-[#9ca3af]" />
            <span className="text-sm text-[#4b5563]">
              {role.userCount || 0} users
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <IconLock size={16} className="text-[#9ca3af]" />
            <span className="text-sm text-[#4b5563]">
              {getPermissionCount()} permissions
            </span>
          </div>
        </div>

        {role.isSystemRole && (
          <div className="flex items-center space-x-1 text-xs text-[#6b7280]">
            <IconSettings size={14} />
            <span>Protected</span>
          </div>
        )}
      </div>

      {/* Permission Preview */}
      {role.permissions && (
        <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
          <div className="flex flex-wrap gap-1">
            {Array.isArray(role.permissions)
              ? role.permissions.slice(0, 3).map((permission, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-[#f3f4f6] text-[#4b5563] text-xs rounded-md"
                >
                  {permission}
                </span>
              ))
              : Object.keys(role.permissions).slice(0, 3).map((category, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-[#f3f4f6] text-[#4b5563] text-xs rounded-md"
                >
                  {category}
                </span>
              ))
            }
            {getPermissionCount() > 3 && (
              <span className="px-2 py-1 bg-[#e5e7eb] text-[#6b7280] text-xs rounded-md">
                +{getPermissionCount() - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleCard;
