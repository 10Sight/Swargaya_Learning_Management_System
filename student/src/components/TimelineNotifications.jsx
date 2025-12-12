import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell,
  BookOpen,
  TrendingDown,
  Info,
  X
} from 'lucide-react';
import axiosInstance from '@/Helper/axiosInstance';
import { toast } from 'sonner';

const TimelineNotifications = ({ studentId, courseId }) => {
  const [notifications, setNotifications] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [recentViolations, setRecentViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  useEffect(() => {
    if (studentId && courseId) {
      fetchTimelineData();
    }
  }, [studentId, courseId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      // Fetch timeline notifications for student
      const notificationsRes = await axiosInstance.get(`/api/module-timelines/notifications/${courseId}`);
      const notificationsData = notificationsRes.data?.data || [];
      setNotifications(notificationsData);

      // Get student's progress to extract timeline violations
      try {
        const progressRes = await axiosInstance.get(`/api/progress/student/${studentId}`);
        const progressData = progressRes.data?.data;

        if (progressData) {
          // Extract timeline violations
          const violations = progressData.timelineViolations || [];
          setRecentViolations(violations);

          // For upcoming deadlines, we'd need to get timelines for the student's departments
          // This is a more complex query that might need backend support
          setUpcomingDeadlines([]);
        }
      } catch (progressError) {
        console.error('Error fetching progress data:', progressError);
        setRecentViolations([]);
        setUpcomingDeadlines([]);
      }

    } catch (error) {
      console.error('Error fetching timeline data:', error);
      toast.error('Failed to load timeline notifications');
      // Set empty arrays on error
      setNotifications([]);
      setUpcomingDeadlines([]);
      setRecentViolations([]);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axiosInstance.patch(`/api/module-timelines/notifications/${courseId}/${notificationId}/read`);

      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = (notificationId) => {
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'DEADLINE_WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'DEADLINE_OVERDUE':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'DEMOTION':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'MODULE_UNLOCKED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'DEADLINE_WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'DEADLINE_OVERDUE':
      case 'DEMOTION':
        return 'bg-red-50 border-red-200';
      case 'MODULE_UNLOCKED':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate - now;

    if (timeDiff < 0) return 'Overdue';

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getUrgencyLevel = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = (deadlineDate - now) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return 'overdue';
    if (hoursRemaining < 1) return 'critical';
    if (hoursRemaining < 24) return 'urgent';
    if (hoursRemaining < 72) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'overdue':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const visibleNotifications = notifications.filter(notif =>
    !dismissedNotifications.has(notif._id) && !notif.isRead
  );

  const activeDeadlines = upcomingDeadlines.filter(deadline =>
    new Date(deadline.deadline) > new Date()
  );

  if (visibleNotifications.length === 0 && activeDeadlines.length === 0 && recentViolations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Critical Notifications */}
      {visibleNotifications.length > 0 && (
        <div className="space-y-2">
          {visibleNotifications.map((notification) => (
            <Alert
              key={notification._id}
              className={`${getNotificationColor(notification.type)} transition-all duration-300`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        {notification.title}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={() => dismissNotification(notification._id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <AlertDescription className="mt-1 text-xs">
                      {notification.message}
                    </AlertDescription>
                    {notification.actionRequired && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => markNotificationAsRead(notification._id)}
                        >
                          Mark as Read
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Upcoming Deadlines */}
      {activeDeadlines.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Upcoming Module Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeDeadlines.map((deadline, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">{deadline.module.title}</p>
                    <p className="text-xs text-gray-500">{deadline.course.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getUrgencyColor(getUrgencyLevel(deadline.deadline))}>
                    {formatTimeRemaining(deadline.deadline)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(deadline.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Violations */}
      {recentViolations.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Recent Timeline Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentViolations.slice(0, 3).map((violation, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded border-l-2 border-red-200">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-3 h-3 text-red-600" />
                  <div>
                    <p className="text-xs font-medium">
                      Demoted from {violation.demotedFromModule?.title || 'Previous Module'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Timeline violation
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(violation.violatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {recentViolations.length > 3 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                +{recentViolations.length - 3} more violations
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimelineNotifications;
