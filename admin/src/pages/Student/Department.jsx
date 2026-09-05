import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/Helper/axiosInstance";
import AccountStatusWrapper from "../../components/student/AccountStatusWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar, Users, BookOpen, Clock, AlertCircle, ArrowRight, ExternalLink, Target, Award, MapPin } from "lucide-react";
import { BRAND } from "@/utils/brandColors";

const StudentDepartment = () => {
  const { isLoading: authLoading } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyDepartments = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/api/departments/me/my-departments");
        const data = res?.data?.data;
        const list = Array.isArray(data?.departments)
          ? data.departments
          : Array.isArray(data)
            ? data
            : [];
        setDepartments(list);
        setError(null);
      } catch {
        setError("Failed to load department information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchMyDepartments();
  }, []);

  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return { backgroundColor: BRAND.blueSoft, color: BRAND.blueDark, borderColor: `${BRAND.blue}55` };
      case "COMPLETED":
        return { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };
      case "UPCOMING":
        return { backgroundColor: "#f8fafc", color: BRAND.navy, borderColor: `${BRAND.navy}33` };
      case "CANCELLED":
        return { backgroundColor: BRAND.redSoft, color: BRAND.red, borderColor: `${BRAND.red}55` };
      default:
        return { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateProgress = (department) => {
    if (!department?.startDate || !department?.endDate) return 0;

    const start = new Date(department.startDate);
    const end = new Date(department.endDate);
    const today = new Date();

    if (today >= end) return 100;
    if (today <= start) return 0;

    const totalDuration = end - start;
    const elapsed = today - start;
    return Math.round((elapsed / totalDuration) * 100);
  };

  const handleDepartmentClick = () => {
    navigate('/student/course');
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate('/student/course');
  };

  if (loading || authLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {[0, 1].map((i) => (
          <Card key={i} className="w-full">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
              <Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const normalizedDepartments = Array.isArray(departments) ? departments : [];

  if (!normalizedDepartments || normalizedDepartments.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Card className="w-full border-dashed">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="relative mb-6">
              <Users className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
              <div className="absolute inset-0 bg-[#e5e7eb] rounded-full blur-xl opacity-30"></div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-800">No Department Assigned</h3>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              You are not currently assigned to any department. Please contact your administrator for course enrollment assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
              <Button
                onClick={() => navigate('/student/course')}
                variant="outline"
                className="flex-1"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Browse Courses</span>
                <span className="sm:hidden">Courses</span>
              </Button>
              <Button
                onClick={() => navigate('/student')}
                className="flex-1"
                style={{ background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.blueDark})` }}
              >
                <Target className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AccountStatusWrapper allowPending={false}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {normalizedDepartments.map((department) => {
          const progress = calculateProgress(department);
          const key = department._id || department.id || department.name;

          return (
            <Card
              key={key}
              className="w-full bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden relative"
              onClick={handleDepartmentClick}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: `linear-gradient(90deg, ${BRAND.navy}, ${BRAND.blueDark})` }}
              ></div>

              <CardHeader className="pb-4 relative">
                {/* Background decoration */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-bl-full transform translate-x-8 -translate-y-8"
                  style={{ background: `linear-gradient(to bottom left, ${BRAND.blueSoft}, transparent)` }}
                ></div>

                <div className="relative flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle
                      className="text-lg sm:text-xl lg:text-2xl flex items-center gap-2 transition-colors leading-tight"
                    >
                      <div className="p-2 rounded-lg transition-colors duration-300" style={{ backgroundColor: BRAND.blueSoft }}>
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform duration-300" style={{ color: BRAND.blue }} />
                      </div>
                      <span className="break-words font-bold text-slate-800 group-hover:text-[#0F2A4F] transition-colors">{department.name}</span>
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1 text-slate-400" />
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-2" style={{ color: BRAND.blueDark }}>
                      Your current learning program details
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Badge
                      className="text-xs sm:text-sm px-3 py-1.5 font-medium rounded-full border"
                      style={getStatusBadgeStyle(department.status)}
                    >
                      {department.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewDetails}
                      className="flex items-center gap-1 text-xs sm:text-sm bg-white/80 backdrop-blur-sm sm:opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ borderColor: `${BRAND.blue}55` }}
                    >
                      <span className="hidden sm:inline">View Course</span>
                      <span className="sm:hidden">View</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: BRAND.blueSoft }}>
                        <BookOpen className="h-4 w-4" style={{ color: BRAND.blue }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium uppercase tracking-wide" style={{ color: BRAND.blueDark }}>
                          {department.courses?.length > 1 ? "Courses" : "Course"}
                        </p>
                        {department.courses && department.courses.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {department.courses.map((c) => (
                              <p key={c._id || c.id} className="font-bold text-sm sm:text-base text-slate-800 break-words leading-tight">
                                {c.difficulty ? <span className="mr-1" style={{ color: BRAND.blue }}>{c.difficulty}:</span> : null}
                                {c.title || c.name}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="font-bold text-sm sm:text-base text-slate-800 break-words leading-tight mt-1">
                            {department.course?.title || department.course?.name || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-emerald-700 uppercase tracking-wide">Start Date</p>
                        <p className="font-bold text-sm sm:text-base text-slate-800 break-words leading-tight mt-1">
                          {department.startDate ? formatDate(department.startDate) : "Not specified"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: BRAND.redSoft }}>
                        <Clock className="h-4 w-4" style={{ color: BRAND.red }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium uppercase tracking-wide" style={{ color: BRAND.redDark }}>End Date</p>
                        <p className="font-bold text-sm sm:text-base text-slate-800 break-words leading-tight mt-1">
                          {department.endDate ? formatDate(department.endDate) : "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(15, 42, 79, 0.08)" }}>
                        <MapPin className="h-4 w-4" style={{ color: BRAND.navy }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium uppercase tracking-wide" style={{ color: BRAND.navy }}>Department ID</p>
                        <p className="font-mono font-bold text-sm break-all text-slate-800 mt-1">{department.name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                {(department.startDate && department.endDate) && (
                  <div className="p-4 sm:p-6 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" style={{ color: BRAND.blue }} />
                        <span className="font-bold text-sm sm:text-base text-slate-800">Department Progress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-bold" style={{ color: BRAND.navy }}>{progress}%</span>
                        <div className="p-1 rounded-full" style={{ backgroundColor: BRAND.blueSoft }}>
                          <Award className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: BRAND.blue }} />
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-3 mb-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${BRAND.navy}, ${BRAND.blue})` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>Started: {department.startDate ? formatDate(department.startDate) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.red }}></div>
                        <span>Ends: {department.endDate ? formatDate(department.endDate) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={handleDepartmentClick}
                    className="flex-1 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    style={{ background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.blueDark})` }}
                    size="lg"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Continue Learning</span>
                    <span className="sm:hidden">Continue Course</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AccountStatusWrapper>
  );
};

export default StudentDepartment;
