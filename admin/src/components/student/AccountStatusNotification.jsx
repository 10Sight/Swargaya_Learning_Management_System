import React from 'react';
import { IconAlertTriangle, IconLock, IconClock } from '@tabler/icons-react';

const AccountStatusNotification = ({ status, fullScreen = false }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          icon: IconClock,
          title: 'Account Pending Approval',
          message: 'Your account is currently pending approval. You can only access your profile page at this time. Please contact your instructor for more information.',
          bgColor: 'bg-[#fefce8]',
          borderColor: 'border-[#fef08a]',
          iconColor: 'text-[#ca8a04]',
          titleColor: 'text-[#854d0e]',
          messageColor: 'text-[#a16207]',
        };
      case 'SUSPENDED':
        return {
          icon: IconAlertTriangle,
          title: 'Account Suspended',
          message: 'Your account has been suspended. Please contact your instructor for more information.',
          bgColor: 'bg-[#fff7ed]',
          borderColor: 'border-[#fed7aa]',
          iconColor: 'text-[#ea580c]',
          titleColor: 'text-[#9a3412]',
          messageColor: 'text-[#c2410c]',
        };
      case 'BANNED':
        return {
          icon: IconLock,
          title: 'Account Banned',
          message: 'Your account has been banned. Please contact your instructor for more information.',
          bgColor: 'bg-[#fef2f2]',
          borderColor: 'border-[#fecaca]',
          iconColor: 'text-[#dc2626]',
          titleColor: 'text-[#991b1b]',
          messageColor: 'text-[#b91c1c]',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const { icon: Icon, title, message, bgColor, borderColor, iconColor, titleColor, messageColor } = config;

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4">
        <div className={`max-w-md w-full ${bgColor} ${borderColor} border-2 rounded-xl shadow-lg p-8 text-center`}>
          <div className="flex justify-center mb-6">
            <Icon className={`w-16 h-16 ${iconColor}`} strokeWidth={1.5} />
          </div>
          <h1 className={`text-2xl font-bold ${titleColor} mb-4`}>
            {title}
          </h1>
          <p className={`${messageColor} leading-relaxed mb-6`}>
            {message}
          </p>
          <div className={`${borderColor} border-t pt-4`}>
            <p className="text-sm text-[#4b5563]">
              Need help? Contact your instructor or administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} strokeWidth={1.5} />
        <div className="flex-1">
          <h3 className={`font-medium ${titleColor} mb-1`}>
            {title}
          </h3>
          <p className={`text-sm ${messageColor}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountStatusNotification;
