import React, { useState, useEffect } from "react";
import {
  IconSettings,
  IconShield,
  IconMail,
  IconDatabase,
  IconCloud,
  IconBell,
  IconLock,
  IconServer,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconDeviceFloppy,
  IconRestore,
  IconEye,
  IconEyeOff,
  IconInfoCircle
} from "@tabler/icons-react";
import {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
  useResetSystemSettingsMutation
} from "@/Redux/AllApi/SuperAdminApi";
import { toast } from "sonner";

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [showPassword, setShowPassword] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Local state for form data
  const [settings, setSettings] = useState({
    // General Settings
    siteName: "Learning Management System",
    siteDescription: "Advanced Learning Management System",
    siteUrl: "https://lms.example.com",
    adminEmail: "admin@example.com",
    timezone: "UTC",
    language: "en",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",

    // Security Settings
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    twoFactorAuth: false,
    ipWhitelist: "",

    // Email Settings
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpEncryption: "tls",
    fromEmail: "",
    fromName: "",

    // System Settings
    maintenanceMode: false,
    maintenanceMessage: "System is under maintenance. Please check back later.",
    maxFileUploadSize: 10,
    allowedFileTypes: "jpg,jpeg,png,pdf,doc,docx,txt",
    autoBackup: true,
    backupRetention: 30,

    // Notification Settings
    emailNotifications: true,
    systemNotifications: true,
    notificationRetention: 90,

    // Performance Settings
    cacheEnabled: true,
    compressionEnabled: true,
    logLevel: "info",
    maxConcurrentUsers: 1000
  });

  // API hooks
  const {
    data: systemSettingsData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetSystemSettingsQuery();

  const [updateSettings, { isLoading: isUpdating }] = useUpdateSystemSettingsMutation();
  const [resetSettings, { isLoading: isResetting }] = useResetSystemSettingsMutation();

  // Update local state when API data loads
  useEffect(() => {
    if (systemSettingsData?.data) {
      setSettings(prev => ({ ...prev, ...systemSettingsData.data }));
    }
  }, [systemSettingsData]);

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings).unwrap();
      toast.success("System settings updated successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(error?.data?.message || "Failed to update settings");
    }
  };

  const handleResetSettings = async () => {
    try {
      await resetSettings().unwrap();
      toast.success("Settings reset to defaults successfully!");
      setShowResetModal(false);
      setHasChanges(false);
      refetch();
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error(error?.data?.message || "Failed to reset settings");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const tabs = [
    { id: "general", label: "General", icon: IconSettings },
    { id: "security", label: "Security", icon: IconShield },
    { id: "email", label: "Email", icon: IconMail },
    { id: "system", label: "System", icon: IconServer },
    { id: "notifications", label: "Notifications", icon: IconBell },
    { id: "performance", label: "Performance", icon: IconDatabase }
  ];

  const PasswordField = ({ label, value, onChange, field, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-[#374151] mb-2">{label}</label>
      <div className="relative">
        <input
          type={showPassword[field] ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          {showPassword[field] ? (
            <IconEyeOff className="w-4 h-4 text-[#6b7280]" />
          ) : (
            <IconEye className="w-4 h-4 text-[#6b7280]" />
          )}
        </button>
      </div>
    </div>
  );

  const ResetModal = () => (
    <div className="fixed inset-0 bg-[#000000] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#ffffff] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <IconAlertTriangle className="w-6 h-6 text-[#ca8a04]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-[#111827] mb-2">
              Reset Settings to Default
            </h3>
            <p className="text-sm text-[#4b5563] mb-4">
              Are you sure you want to reset all settings to their default values? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-[#374151] bg-[#f3f4f6] rounded-md hover:bg-[#e5e7eb] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSettings}
                disabled={isResetting}
                className="px-4 py-2 bg-[#dc2626] text-[#ffffff] rounded-md hover:bg-[#b91c1c] transition-colors disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Reset Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">System Settings</h1>
            <p className="text-[#4b5563] mt-1">Configure system-wide settings and parameters</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">System Settings</h1>
            <p className="text-[#4b5563] mt-1">Configure system-wide settings and parameters</p>
          </div>
        </div>
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <IconAlertTriangle className="w-6 h-6 text-[#dc2626]" />
            <div>
              <h3 className="text-[#991b1b] font-medium">Error Loading Settings</h3>
              <p className="text-[#b91c1c] mt-1">
                {error?.data?.message || "Failed to load system settings"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">System Settings</h1>
          <p className="text-[#4b5563] mt-1">
            Configure system-wide settings and parameters
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#f3f4f6] text-[#374151] rounded-md hover:bg-[#e5e7eb] transition-colors"
          >
            <IconRefresh className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#fee2e2] text-[#b91c1c] rounded-md hover:bg-[#fecaca] transition-colors"
          >
            <IconRestore className="w-4 h-4" />
            <span>Reset to Default</span>
          </button>
          {hasChanges && (
            <button
              onClick={handleSaveSettings}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 bg-[#2563eb] text-[#ffffff] rounded-md hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              <IconDeviceFloppy className="w-4 h-4" />
              <span>{isUpdating ? "Saving..." : "Save Changes"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-[#fefce8] border border-[#fef08a] rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <IconInfoCircle className="w-5 h-5 text-[#ca8a04]" />
            <div>
              <h3 className="text-[#854d0e] font-medium">Unsaved Changes</h3>
              <p className="text-[#a16207] text-sm mt-1">
                You have unsaved changes. Don't forget to save your settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[#ffffff] rounded-lg shadow-sm border border-[#d1d5db]">
        <div className="border-b border-[#d1d5db]">
          <div className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? "border-[#3b82f6] text-[#2563eb]"
                    : "border-transparent text-[#6b7280] hover:text-[#374151] hover:border-[#d1d5db]"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* General Settings */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Site Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => handleInputChange("siteName", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Site URL</label>
                  <input
                    type="url"
                    value={settings.siteUrl}
                    onChange={(e) => handleInputChange("siteUrl", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Admin Email</label>
                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => handleInputChange("adminEmail", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleInputChange("timezone", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Site Description</label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) => handleInputChange("siteDescription", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange("sessionTimeout", parseInt(e.target.value))}
                    min="5"
                    max="480"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Max Login Attempts</label>
                  <input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange("maxLoginAttempts", parseInt(e.target.value))}
                    min="3"
                    max="10"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Password Min Length</label>
                  <input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => handleInputChange("passwordMinLength", parseInt(e.target.value))}
                    min="6"
                    max="32"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#111827]">Password Requirements</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.passwordRequireSpecial}
                      onChange={(e) => handleInputChange("passwordRequireSpecial", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Require special characters</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.passwordRequireNumbers}
                      onChange={(e) => handleInputChange("passwordRequireNumbers", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Require numbers</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.passwordRequireUppercase}
                      onChange={(e) => handleInputChange("passwordRequireUppercase", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Require uppercase letters</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={(e) => handleInputChange("twoFactorAuth", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Enable Two-Factor Authentication</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => handleInputChange("smtpHost", e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => handleInputChange("smtpPort", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">SMTP Username</label>
                  <input
                    type="text"
                    value={settings.smtpUsername}
                    onChange={(e) => handleInputChange("smtpUsername", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <PasswordField
                  label="SMTP Password"
                  value={settings.smtpPassword}
                  onChange={(value) => handleInputChange("smtpPassword", value)}
                  field="smtpPassword"
                  placeholder="Enter SMTP password"
                />
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Encryption</label>
                  <select
                    value={settings.smtpEncryption}
                    onChange={(e) => handleInputChange("smtpEncryption", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="none">None</option>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">From Email</label>
                  <input
                    type="email"
                    value={settings.fromEmail}
                    onChange={(e) => handleInputChange("fromEmail", e.target.value)}
                    placeholder="noreply@example.com"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">From Name</label>
                  <input
                    type="text"
                    value={settings.fromName}
                    onChange={(e) => handleInputChange("fromName", e.target.value)}
                    placeholder="Learning Management System"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleInputChange("maintenanceMode", e.target.checked)}
                    className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                  />
                  <span className="ml-2 text-sm font-medium text-[#374151]">Maintenance Mode</span>
                </label>
                {settings.maintenanceMode && (
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">Maintenance Message</label>
                    <textarea
                      value={settings.maintenanceMessage}
                      onChange={(e) => handleInputChange("maintenanceMessage", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Max File Upload Size (MB)</label>
                  <input
                    type="number"
                    value={settings.maxFileUploadSize}
                    onChange={(e) => handleInputChange("maxFileUploadSize", parseInt(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Backup Retention (days)</label>
                  <input
                    type="number"
                    value={settings.backupRetention}
                    onChange={(e) => handleInputChange("backupRetention", parseInt(e.target.value))}
                    min="7"
                    max="365"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Allowed File Types</label>
                <input
                  type="text"
                  value={settings.allowedFileTypes}
                  onChange={(e) => handleInputChange("allowedFileTypes", e.target.value)}
                  placeholder="jpg,png,pdf,doc,docx"
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
                <p className="text-xs text-[#6b7280] mt-1">Comma-separated list of allowed file extensions</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoBackup}
                    onChange={(e) => handleInputChange("autoBackup", e.target.checked)}
                    className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                  />
                  <span className="ml-2 text-sm text-[#374151]">Enable Automatic Backups</span>
                </label>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#111827]">Notification Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleInputChange("emailNotifications", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Enable Email Notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.systemNotifications}
                      onChange={(e) => handleInputChange("systemNotifications", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Enable System Notifications</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Notification Retention (days)</label>
                <input
                  type="number"
                  value={settings.notificationRetention}
                  onChange={(e) => handleInputChange("notificationRetention", parseInt(e.target.value))}
                  min="7"
                  max="365"
                  className="w-full max-w-xs px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
                <p className="text-xs text-[#6b7280] mt-1">How long to keep notifications before automatically deleting them</p>
              </div>
            </div>
          )}

          {/* Performance Settings */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#111827]">Performance Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.cacheEnabled}
                      onChange={(e) => handleInputChange("cacheEnabled", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Enable Caching</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.compressionEnabled}
                      onChange={(e) => handleInputChange("compressionEnabled", e.target.checked)}
                      className="rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#3b82f6]"
                    />
                    <span className="ml-2 text-sm text-[#374151]">Enable Compression</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Log Level</label>
                  <select
                    value={settings.logLevel}
                    onChange={(e) => handleInputChange("logLevel", e.target.value)}
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Max Concurrent Users</label>
                  <input
                    type="number"
                    value={settings.maxConcurrentUsers}
                    onChange={(e) => handleInputChange("maxConcurrentUsers", parseInt(e.target.value))}
                    min="100"
                    max="10000"
                    className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showResetModal && <ResetModal />}
    </div>
  );
};

export default SystemSettings;
