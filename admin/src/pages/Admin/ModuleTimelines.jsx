import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Bell,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import axiosInstance from '@/Helper/axiosInstance';
import { toast } from 'sonner';

const ModuleTimelines = () => {
  const [timelines, setTimelines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedCourseForStatus, setSelectedCourseForStatus] = useState(null);
  const [selectedDepartmentForStatus, setSelectedDepartmentForStatus] = useState(null);
  const [timelineStatus, setTimelineStatus] = useState([]);
  const [formData, setFormData] = useState({
    courseId: '',
    moduleId: '',
    departmentId: '',
    deadline: '',
    gracePeriodHours: 24,
    enableWarnings: true,
    warningPeriods: [168, 72, 24], // 7 days, 3 days, 1 day
    description: ''
  });
  const [modules, setModules] = useState([]);
  const [editingTimeline, setEditingTimeline] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [timelinesRes, coursesRes, departmentsRes] = await Promise.all([
        axiosInstance.get('/api/module-timelines'),
        axiosInstance.get('/api/courses'),
        axiosInstance.get('/api/departments')
      ]);

      console.log('API Responses:', {
        timelines: timelinesRes.data,
        courses: coursesRes.data,
        departments: departmentsRes.data
      });

      // Handle timeline response structure
      const timelineData = timelinesRes.data?.data?.timelines || timelinesRes.data?.data || [];
      setTimelines(Array.isArray(timelineData) ? timelineData : []);

      // Handle courses response structure - try multiple possible structures
      let coursesData = coursesRes.data?.data?.courses || coursesRes.data?.data || coursesRes.data || [];
      if (!Array.isArray(coursesData)) {
        console.warn('Courses data is not an array:', coursesData);
        coursesData = [];
      }
      setCourses(coursesData);

      // Handle departments response structure
      let departmentsData = departmentsRes.data?.data?.departments || departmentsRes.data?.data || departmentsRes.data || [];
      if (!Array.isArray(departmentsData)) {
        console.warn('Departments data is not an array:', departmentsData);
        departmentsData = [];
      }
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load timeline data');
      // Set empty arrays to prevent rendering errors
      setTimelines([]);
      setCourses([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = async (courseId) => {
    setFormData(prev => ({ ...prev, courseId, moduleId: '' }));

    if (courseId) {
      try {
        const course = courses.find(c => c._id === courseId);
        console.log('Selected course:', course);

        if (course && course.modules && Array.isArray(course.modules)) {
          console.log('Course modules:', course.modules);

          // Check if modules are already populated with full data
          if (course.modules.length > 0 && typeof course.modules[0] === 'object' && course.modules[0]._id) {
            console.log('Modules already populated in course data');
            setModules(course.modules.sort((a, b) => (a.order || 0) - (b.order || 0)));
            return;
          }

          // Try to fetch detailed module information
          console.log('Attempting to fetch individual modules...');
          const modulePromises = course.modules.map(async (moduleId) => {
            try {
              console.log('Fetching module with ID:', moduleId);
              const response = await axiosInstance.get(`/api/modules/${moduleId}`);
              console.log('Module response for', moduleId, ':', response.data);
              return response.data.data || response.data;
            } catch (moduleError) {
              console.error(`Error fetching module ${moduleId}:`, moduleError);
              // Return a fallback object with the ID if individual fetch fails
              return {
                _id: moduleId,
                title: `Module ${moduleId}`,
                order: 0
              };
            }
          });

          const moduleData = await Promise.all(modulePromises);
          const validModules = moduleData.filter(module => module && module._id);

          console.log('Processed module data:', validModules);
          setModules(validModules.sort((a, b) => (a.order || 0) - (b.order || 0)));

          if (validModules.length === 0) {
            toast.error('No valid modules found for this course');
          } else if (validModules.length < course.modules.length) {
            toast.warning(`Only ${validModules.length} of ${course.modules.length} modules could be loaded`);
          }

        } else if (course && course.modules) {
          console.log('Course modules exist but not as expected array:', course.modules);
          // Try to use course.modules directly if it's a different structure
          if (typeof course.modules === 'object') {
            const moduleArray = Object.values(course.modules).filter(m => m && m._id);
            if (moduleArray.length > 0) {
              console.log('Using modules from course object values:', moduleArray);
              setModules(moduleArray.sort((a, b) => (a.order || 0) - (b.order || 0)));
            } else {
              setModules([]);
            }
          } else {
            setModules([]);
          }
        } else {
          console.log('No modules found for course');
          setModules([]);
        }
      } catch (error) {
        console.error('Error in handleCourseChange:', error);
        console.error('Error details:', error.response?.data);
        toast.error(`Failed to load modules: ${error.response?.data?.message || error.message}`);
        setModules([]); // Ensure modules is reset on error
      }
    } else {
      setModules([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Form submission started');
    console.log('Form data:', formData);
    console.log('Selected module from modules array:', modules.find(m => m._id === formData.moduleId));

    if (!formData.courseId || !formData.moduleId || !formData.departmentId || !formData.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that the moduleId is a valid ObjectId format (24 characters, alphanumeric)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(formData.moduleId)) {
      console.error('Invalid module ID format:', formData.moduleId);
      toast.error('Invalid module ID format. Please select a module from the dropdown.');
      return;
    }

    try {
      const payload = {
        ...formData,
        deadline: new Date(formData.deadline).toISOString(),
        warningPeriods: formData.warningPeriods.filter(p => p > 0)
      };

      console.log('Payload being sent:', payload);

      if (editingTimeline) {
        // Update existing timeline
        console.log('Updating timeline:', editingTimeline._id);
        await axiosInstance.put(`/api/module-timelines/${editingTimeline._id}`, payload);
      } else {
        // Create new timeline
        console.log('Creating new timeline');
        await axiosInstance.post('/api/module-timelines', payload);
      }

      toast.success(editingTimeline ? 'Timeline updated successfully' : 'Timeline created successfully');
      setDialogOpen(false);
      resetForm();
      fetchInitialData();
    } catch (error) {
      console.error('Error saving timeline:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save timeline');
    }
  };

  const handleEdit = (timeline) => {
    setEditingTimeline(timeline);
    setFormData({
      courseId: timeline.course?._id || '',
      moduleId: timeline.module?._id || '',
      departmentId: timeline.department?._id || '',
      deadline: timeline.deadline ? new Date(timeline.deadline).toISOString().slice(0, 16) : '',
      gracePeriodHours: timeline.gracePeriodHours || 24,
      enableWarnings: timeline.enableWarnings !== undefined ? timeline.enableWarnings : true,
      warningPeriods: timeline.warningPeriods || [168, 72, 24],
      description: timeline.description || ''
    });

    // Load modules for the selected course
    if (timeline.course?._id) {
      handleCourseChange(timeline.course._id);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (timelineId) => {
    if (!window.confirm('Are you sure you want to delete this timeline?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/module-timelines/${timelineId}`);
      toast.success('Timeline deleted successfully');
      fetchInitialData();
    } catch (error) {
      console.error('Error deleting timeline:', error);
      toast.error('Failed to delete timeline');
    }
  };

  const runEnforcement = async () => {
    try {
      const response = await axiosInstance.post('/api/module-timelines/process-enforcement');
      const result = response.data.data;

      toast.success(
        `Enforcement completed: ${result.processedCount} timelines processed, ${result.demotionCount} students demoted`
      );

      if (result.errors && result.errors.length > 0) {
        console.warn('Enforcement errors:', result.errors);
      }

      fetchInitialData();
    } catch (error) {
      console.error('Error running enforcement:', error);
      toast.error('Failed to run timeline enforcement');
    }
  };

  const sendWarnings = async () => {
    try {
      const response = await axiosInstance.post('/api/module-timelines/send-warnings');
      const result = response.data.data;

      toast.success(`Warnings sent: ${result.warningsSent} notifications sent`);

      if (result.errors && result.errors.length > 0) {
        console.warn('Warning errors:', result.errors);
      }
    } catch (error) {
      console.error('Error sending warnings:', error);
      toast.error('Failed to send warnings');
    }
  };

  const viewTimelineStatus = async (courseId, departmentId) => {
    try {
      setSelectedCourseForStatus(courseId);
      setSelectedDepartmentForStatus(departmentId);

      const response = await axiosInstance.get(`/api/module-timelines/status/${courseId}/${departmentId}`);
      setTimelineStatus(response.data.data);
      setStatusDialogOpen(true);
    } catch (error) {
      console.error('Error fetching timeline status:', error);
      toast.error('Failed to load timeline status');
    }
  };

  const resetForm = () => {
    setFormData({
      courseId: '',
      moduleId: '',
      departmentId: '',
      deadline: '',
      gracePeriodHours: 24,
      enableWarnings: true,
      warningPeriods: [168, 72, 24],
      description: ''
    });
    setModules([]);
    setEditingTimeline(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60);

    if (hoursUntilDeadline < 0) return 'bg-red-100 text-red-800';
    if (hoursUntilDeadline < 24) return 'bg-orange-100 text-orange-800';
    if (hoursUntilDeadline < 72) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60);

    if (hoursUntilDeadline < 0) return 'Overdue';
    if (hoursUntilDeadline < 1) return 'Due soon';
    if (hoursUntilDeadline < 24) return `${Math.ceil(hoursUntilDeadline)}h left`;
    return `${Math.ceil(hoursUntilDeadline / 24)}d left`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Timelines</h1>
          <p className="text-gray-600">Manage module deadlines and automatic progression</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={sendWarnings} variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Send Warnings
          </Button>
          <Button onClick={runEnforcement} variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Run Enforcement
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Timeline
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTimeline ? 'Edit Timeline' : 'Create New Timeline'}
                </DialogTitle>
                <DialogDescription>
                  Set a deadline for module completion. Students will be demoted if they miss the deadline.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course *</Label>
                    <Select value={formData.courseId} onValueChange={handleCourseChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(courses) && courses.map(course => (
                          <SelectItem key={course._id} value={course._id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select value={formData.departmentId} onValueChange={value => setFormData(prev => ({ ...prev, departmentId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(departments) && departments.map(department => (
                          <SelectItem key={department._id} value={department._id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="module">Module *</Label>
                  <Select value={formData.moduleId} onValueChange={value => setFormData(prev => ({ ...prev, moduleId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(modules) && modules.map(module => (
                        <SelectItem key={module._id} value={module._id}>
                          Module {module.order}: {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline *</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={formData.deadline}
                      onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gracePeriod">Grace Period (hours)</Label>
                    <Input
                      id="gracePeriod"
                      type="number"
                      min="0"
                      value={formData.gracePeriodHours}
                      onChange={e => setFormData(prev => ({ ...prev, gracePeriodHours: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableWarnings"
                      checked={formData.enableWarnings}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, enableWarnings: checked }))}
                    />
                    <Label htmlFor="enableWarnings">Enable warning notifications</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this timeline"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTimeline ? 'Update Timeline' : 'Create Timeline'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Timeline Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Timeline Status Report</DialogTitle>
            <DialogDescription>
              Student progress against module deadlines
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Array.isArray(timelineStatus) && timelineStatus.map((moduleStatus, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {moduleStatus.module.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(moduleStatus.deadline)}>
                      {getStatusText(moduleStatus.deadline)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Due: {formatDate(moduleStatus.deadline)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(moduleStatus.students) && moduleStatus.students.map((studentStatus, studentIndex) => (
                      <div key={studentIndex} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{studentStatus.student.fullName}</span>
                          <span className="text-xs text-gray-500 ml-2">{studentStatus.student.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {studentStatus.status === 'COMPLETED' && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {studentStatus.status === 'MISSED_DEADLINE' && (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              Missed
                            </Badge>
                          )}
                          {studentStatus.status === 'OVERDUE' && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {studentStatus.status === 'IN_PROGRESS' && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" />
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Timelines List */}
      <div className="space-y-4">
        {timelines.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timelines set</h3>
              <p className="text-gray-600 mb-4">Create your first module timeline to start managing deadlines</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Timeline
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {Array.isArray(timelines) && timelines.map((timeline) => (
              <Card key={timeline._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{timeline.course?.title || 'Unknown Course'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{timeline.module?.title || 'Unknown Module'}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {timeline.department?.name || 'Unknown Department'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {timeline.deadline ? formatDate(timeline.deadline) : 'No deadline'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeline.gracePeriodHours || 0}h grace
                        </div>
                      </div>

                      {timeline.description && (
                        <p className="text-sm text-gray-600">{timeline.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(timeline.deadline)}>
                        {getStatusText(timeline.deadline)}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewTimelineStatus(timeline.course?._id, timeline.department?._id)}
                          disabled={!timeline.course?._id || !timeline.department?._id}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Status
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(timeline)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(timeline._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                  {timeline.enableWarnings && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Bell className="w-3 h-3" />
                        Warnings enabled: 7d, 3d, 1d before deadline
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleTimelines;
