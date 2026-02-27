import React, { useState } from 'react';
import { Bell, X, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useSocket } from '../../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import useTranslate from '@/hooks/useTranslate';

const NotificationCenter = () => {
    const { notifications, isConnected, clearNotifications, removeNotification } = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslate();

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'quiz-started':
            case 'assignment-created':
                return <Info className="h-4 w-4 text-[#3b82f6]" />;
            case 'quiz-submitted':
            case 'assignment-submitted':
                return <CheckCircle className="h-4 w-4 text-[#22c55e]" />;
            case 'grade-updated':
                return <AlertCircle className="h-4 w-4 text-[#f97316]" />;
            case 'announcement':
                return <Bell className="h-4 w-4 text-[#a855f7]" />;
            default:
                return <Clock className="h-4 w-4 text-[#6b7280]" />;
        }
    };

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'quiz-started':
            case 'assignment-created':
                return 'border-l-4 border-[#3b82f6] bg-[#eff6ff]';
            case 'quiz-submitted':
            case 'assignment-submitted':
                return 'border-l-4 border-[#22c55e] bg-[#f0fdf4]';
            case 'grade-updated':
                return 'border-l-4 border-[#f97316] bg-[#fff7ed]';
            case 'announcement':
                return 'border-l-4 border-[#a855f7] bg-[#f3e8ff]';
            default:
                return 'border-l-4 border-[#6b7280] bg-[#f9fafb]';
        }
    };

    return (
        <div className="relative">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="relative p-2"
                    >
                        <Bell className={`h-5 w-5 ${isConnected ? 'text-[#16a34a]' : 'text-[#9ca3af]'}`} />
                        {notifications.length > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                            >
                                {notifications.length > 9 ? '9+' : notifications.length}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                    {t('notify.title')}
                                    <span className="ml-2 text-sm font-normal text-[#6b7280]">
                                        ({notifications.length})
                                    </span>
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                                    <span className="text-xs text-[#6b7280]">
                                        {isConnected ? t('notify.connected') : t('notify.disconnected')}
                                    </span>
                                    {notifications.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearNotifications}
                                            className="text-xs px-2 py-1 h-auto"
                                        >
                                            {t('notify.clearAll')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-[#6b7280]">
                                        <Bell className="h-8 w-8 mx-auto mb-2 text-[#d1d5db]" />
                                        <p className="text-sm">{t('notify.emptyTitle')}</p>
                                        <p className="text-xs text-[#9ca3af] mt-1">
                                            {t('notify.emptyDescription')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {notifications.map((notification, index) => (
                                            <div
                                                key={`${notification.timestamp}-${index}`}
                                                className={`p-4 hover:bg-[#f9fafb] transition-colors ${getNotificationStyle(notification.type)}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        {getNotificationIcon(notification.type)}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-[#111827] leading-tight">
                                                                {notification.message}
                                                            </p>
                                                            {notification.from && (
                                                                <p className="text-xs text-[#4b5563] mt-1">
                                                                    {t('notify.from')} {notification.from}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-[#6b7280] mt-1">
                                                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                                            </p>
                                                            {/* Additional info based on notification type */}
                                                            {notification.quiz && (
                                                                <p className="text-xs text-[#2563eb] mt-1">
                                                                    {t('notify.quiz')} {notification.quiz.title}
                                                                </p>
                                                            )}
                                                            {notification.assignment && (
                                                                <p className="text-xs text-[#2563eb] mt-1">
                                                                    {t('notify.assignment')} {notification.assignment.title}
                                                                </p>
                                                            )}
                                                            {notification.grade && (
                                                                <p className="text-xs text-[#ea580c] mt-1">
                                                                    {t('notify.score')} {notification.grade.score || 'N/A'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeNotification(index)}
                                                        className="p-1 h-auto text-[#9ca3af] hover:text-[#4b5563]"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default NotificationCenter;
