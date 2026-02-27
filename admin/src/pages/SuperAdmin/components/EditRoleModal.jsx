import React, { useState, useEffect } from 'react';
import {
  IconX,
  IconShield,
  IconCheck,
  IconLoader,
  IconAlertTriangle,
  IconLock,
  IconChevronDown
} from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { useUpdateRoleMutation } from '@/Redux/AllApi/SuperAdminApi';

const EditRoleModal = ({ open, onClose, role, permissions, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [expandedCategories, setExpandedCategories] = useState({});

  const [updateRole, { isLoading }] = useUpdateRoleMutation();

  useEffect(() => {
    if (role && open) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: Array.isArray(role.permissions)
          ? role.permissions
          : Object.values(role.permissions || {}).flat()
      });
    }
  }, [role, open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleCategoryToggle = (category, categoryPermissions) => {
    const categoryPermissionIds = categoryPermissions.map(p => p.id);
    const allSelected = categoryPermissionIds.every(id => formData.permissions.includes(id));

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !categoryPermissionIds.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissionIds])]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      await updateRole({
        id: role.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: formData.permissions
      }).unwrap();

      toast.success('Role updated successfully');
      onSuccess();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update role');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', permissions: [] });
    setExpandedCategories({});
  };

  if (!open || !role) return null;

  const isSystemRole = role.isSystemRole;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1300] p-4 text-left">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isSystemRole ? 'bg-[#fee2e2]' : 'bg-[#dbeafe]'}`}>
              <IconShield size={24} className={isSystemRole ? 'text-[#dc2626]' : 'text-[#2563eb]'} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#111827]">
                {isSystemRole ? 'View System Role' : 'Edit Custom Role'}
              </h2>
              <p className="text-sm text-[#4b5563]">
                {isSystemRole
                  ? 'System roles are protected and cannot be modified'
                  : 'Update role details and permissions'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#9ca3af] hover:text-[#4b5563] hover:bg-[#f3f4f6] rounded-lg transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* System Role Warning */}
            {isSystemRole && (
              <div className="bg-[#fefce8] border border-[#fef08a] rounded-lg p-4">
                <div className="flex items-center">
                  <IconLock className="text-[#ca8a04] mr-2" size={20} />
                  <p className="text-[#854d0e]">
                    This is a system role and cannot be modified. You can view its permissions below.
                  </p>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#111827]">Basic Information</h3>

              <div>
                <label htmlFor="roleName" className="block text-sm font-medium text-[#374151] mb-2">
                  Role Name *
                </label>
                <input
                  id="roleName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent disabled:bg-[#f3f4f6]"
                  placeholder="Enter role name"
                  disabled={isSystemRole}
                  required
                />
              </div>

              <div>
                <label htmlFor="roleDescription" className="block text-sm font-medium text-[#374151] mb-2">
                  Description
                </label>
                <textarea
                  id="roleDescription"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent disabled:bg-[#f3f4f6]"
                  placeholder="Describe this role and its purpose"
                  disabled={isSystemRole}
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#111827]">Permissions</h3>
                <span className="text-sm text-[#4b5563]">
                  {formData.permissions.length} selected
                </span>
              </div>

              {Object.entries(permissions).map(([category, categoryPermissions]) => {
                const isExpanded = expandedCategories[category];
                // categoryPermissions are objects {id, name, description}
                const selectedCount = categoryPermissions.filter(p => formData.permissions.includes(p.id)).length;
                const allSelected = selectedCount === categoryPermissions.length;

                return (
                  <div key={category} className="border border-[#e5e7eb] rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div className="bg-[#f9fafb] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => handleCategoryToggle(category, categoryPermissions)}
                              className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#3b82f6]"
                              disabled={isSystemRole}
                            />
                            <span className="font-medium text-[#111827] capitalize">
                              {category.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </label>
                          <span className="text-sm text-[#6b7280]">
                            ({selectedCount}/{categoryPermissions.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="text-[#9ca3af] hover:text-[#4b5563]"
                        >
                          <IconChevronDown
                            size={16}
                            className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Category Permissions */}
                    {isExpanded && (
                      <div className="p-4 space-y-2">
                        {categoryPermissions.map((permission) => (
                          <label key={permission.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                              className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#3b82f6]"
                              disabled={isSystemRole}
                            />
                            <span className="text-sm text-[#374151]">{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#e5e7eb] bg-[#f9fafb]">
            <div className="flex items-center text-sm text-[#4b5563]">
              <IconAlertTriangle size={16} className="mr-1" />
              {isSystemRole
                ? 'System roles are protected and cannot be modified'
                : 'Changes will be applied to all users with this role'
              }
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[#374151] bg-white border border-[#d1d5db] rounded-lg hover:bg-[#f9fafb] transition-colors"
              >
                {isSystemRole ? 'Close' : 'Cancel'}
              </button>
              {!isSystemRole && (
                <button
                  type="submit"
                  disabled={isLoading || !formData.name.trim() || formData.permissions.length === 0}
                  className="px-4 py-2 bg-[#2563eb] text-[#ffffff] rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <IconLoader className="animate-spin" size={16} />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <IconShield size={16} />
                      <span>Update Role</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoleModal;
