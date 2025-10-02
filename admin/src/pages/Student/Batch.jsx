import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/Helper/axiosInstance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar, Users, BookOpen, Clock, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";

const StudentBatch = () => {
  const { isLoading: authLoading } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyBatch = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/api/batches/me/my-batch");
        setBatch(res?.data?.data || null);
        setError(null);
      } catch (e) {
        setError("Failed to load batch information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchMyBatch();
  }, []);

  const getStatusVariant = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "default";
      case "COMPLETED":
        return "secondary";
      case "UPCOMING":
        return "outline";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateProgress = () => {
    if (!batch?.startDate || !batch?.endDate) return 0;
    
    const start = new Date(batch.startDate);
    const end = new Date(batch.endDate);
    const today = new Date();
    
    if (today >= end) return 100;
    if (today <= start) return 0;
    
    const totalDuration = end - start;
    const elapsed = today - start;
    return Math.round((elapsed / totalDuration) * 100);
  };

  const handleBatchClick = () => {
    navigate('/student/course');
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate('/student/course');
  };

  const handleQuickActions = (action, e) => {
    e.stopPropagation();
    navigate('/student/course');
  };

  if (loading || authLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
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

  if (!batch) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Batch Assigned</h3>
          <p className="text-muted-foreground mb-4">
            You are not currently assigned to any batch. Please contact administration for assistance.
          </p>
          <Button onClick={() => navigate('/batches')} variant="outline">
            Browse Available Batches
          </Button>
        </CardContent>
      </Card>
    );
  }

  const progress = calculateProgress();

  return (
    <Card 
      className="w-full shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={handleBatchClick}
    >
      <CardHeader className="pb-4 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="break-words">{batch.name}</span>
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Your current learning program details
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(batch.status)} className="text-xs sm:text-sm">
              {batch.status}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewDetails}
              className="flex items-center gap-1 text-xs sm:text-sm sm:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="hidden sm:inline">View Details</span>
              <span className="sm:hidden">View</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Course</p>
                <p className="font-semibold break-words">
                  {batch.course?.title || batch.course?.name || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <p className="font-semibold break-words">
                  {batch.startDate ? formatDate(batch.startDate) : "Not specified"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <p className="font-semibold break-words">
                  {batch.endDate ? formatDate(batch.endDate) : "Not specified"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Batch Code</p>
                <p className="font-mono font-semibold text-sm break-all">{batch.name}</p>
              </div>
            </div>
          </div>
        </div>

        {(batch.startDate && batch.endDate) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Course Progress</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between text-xs text-muted-foreground gap-1">
              <span>Start: {batch.startDate ? formatDate(batch.startDate) : 'N/A'}</span>
              <span>End: {batch.endDate ? formatDate(batch.endDate) : 'N/A'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentBatch;