import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Unlock, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Info
} from 'lucide-react';
import axiosInstance from '@/Helper/axiosInstance';
import { toast } from 'sonner';
import TimelineNotifications from './TimelineNotifications';

const ModuleAccessControl = ({ courseId, modules, progress, onModuleClick }) => {
  const [moduleAccess, setModuleAccess] = useState({});
  const [loading, setLoading] = useState(false);
  const [timelineRestrictions, setTimelineRestrictions] = useState(null);

  useEffect(() => {
    if (courseId && modules.length > 0) {
      checkModuleAccess();
    }
  }, [courseId, modules, progress]);

  const checkModuleAccess = async () => {
    if (!modules || modules.length === 0) return;
    
    setLoading(true);
    try {
      // Check access for each module with timeline enforcement
      const accessPromises = modules.map(async (module) => {
        try {
          const response = await axiosInstance.get(`/api/progress/timeline-access/${courseId}/${module._id}`);
          return {
            moduleId: module._id,
            ...response.data.data
          };
        } catch (error) {
          console.error(`Error checking access for module ${module._id}:`, error);
          return {
            moduleId: module._id,
            hasAccess: false,
            reason: 'Error checking access',
            isTimelineRestricted: false
          };
        }
      });

      const accessResults = await Promise.all(accessPromises);
      const accessMap = {};
      let timelineInfo = null;

      accessResults.forEach((result) => {
        accessMap[result.moduleId] = result;
        
        // Get timeline restriction info from first result that has it
        if (!timelineInfo && result.currentAccessibleModule) {
          timelineInfo = {
            currentAccessibleModule: result.currentAccessibleModule,
            currentAccessibleModuleIndex: result.currentAccessibleModuleIndex
          };
        }
      });

      setModuleAccess(accessMap);
      setTimelineRestrictions(timelineInfo);
    } catch (error) {
      console.error('Error checking module access:', error);
      toast.error('Failed to check module access');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = async (module, access) => {
    if (!access?.hasAccess) {
      if (access?.isTimelineRestricted) {
        toast.error(`Module access is restricted due to timeline enforcement. Complete Module ${access.currentAccessibleModuleIndex} first.`);
      } else {
        toast.error(access?.reason || 'You cannot access this module yet.');
      }
      return;
    }

    // Allow access and call parent handler
    onModuleClick?.(module);
  };

  const getModuleStatus = (module, access) => {
    const isCompleted = progress?.completedModuleIds?.includes(module._id.toString());
    
    if (isCompleted) {
      return {
        status: 'completed',
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Completed'
      };
    }
    
    if (!access?.hasAccess) {
      if (access?.isTimelineRestricted) {
        return {
          status: 'timeline-locked',
          icon: <Clock className="w-5 h-5 text-orange-600" />,
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'Timeline Restricted'
        };
      } else {
        return {
          status: 'locked',
          icon: <Lock className="w-5 h-5 text-gray-600" />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Locked'
        };
      }
    }
    
    return {
      status: 'available',
      icon: <Unlock className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Available'
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {modules.map((module, index) => (
          <Card key={module._id} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sortedModules = modules.sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      {/* Timeline Notifications */}
      <TimelineNotifications 
        studentId={progress?.student} 
        courseId={courseId} 
      />

      {/* Timeline Restriction Notice */}
      {timelineRestrictions && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Timeline Enforcement Active:</strong> You can currently access up to Module {timelineRestrictions.currentAccessibleModuleIndex}. 
            Complete modules by their deadlines to unlock the next ones.
          </AlertDescription>
        </Alert>
      )}

      {/* Module List */}
      <div className="space-y-4">
        {sortedModules.map((module, index) => {
          const access = moduleAccess[module._id];
          const moduleStatus = getModuleStatus(module, access);
          const isClickable = access?.hasAccess;

          return (
            <Card
              key={module._id}
              className={`transition-all duration-200 ${
                isClickable 
                  ? 'hover:shadow-md cursor-pointer hover:border-blue-300' 
                  : 'opacity-75'
              } ${moduleStatus.status === 'timeline-locked' ? 'border-orange-200' : ''}`}
              onClick={() => handleModuleClick(module, access)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-semibold">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{module.title}</h3>
                        <Badge className={`text-xs ${moduleStatus.color}`}>
                          <span className="flex items-center gap-1">
                            {moduleStatus.icon}
                            {moduleStatus.label}
                          </span>
                        </Badge>
                      </div>
                      
                      {module.description && (
                        <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                      )}
                      
                      {access && !access.hasAccess && (
                        <p className="text-xs text-red-600 mt-1">
                          {access.reason}
                        </p>
                      )}
                      
                      {/* Module Progress Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {module.lessons?.length || 0} lessons
                        </span>
                        {module.estimatedDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {module.estimatedDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {isClickable && (
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Access Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm text-gray-700">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {progress?.completedModuleIds?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {Object.values(moduleAccess).filter(a => a?.hasAccess && !progress?.completedModuleIds?.includes(a.moduleId)).length}
              </div>
              <div className="text-xs text-gray-600">Available</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-orange-600">
                {Object.values(moduleAccess).filter(a => a?.isTimelineRestricted).length}
              </div>
              <div className="text-xs text-gray-600">Timeline Locked</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-gray-600">
                {Object.values(moduleAccess).filter(a => !a?.hasAccess && !a?.isTimelineRestricted).length}
              </div>
              <div className="text-xs text-gray-600">Sequential Locked</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleAccessControl;
