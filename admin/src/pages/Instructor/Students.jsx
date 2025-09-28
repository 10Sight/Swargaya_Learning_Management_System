import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGetInstructorBatchStudentsQuery, useGetInstructorAssignedBatchesQuery } from '@/Redux/AllApi/InstructorApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  IconUsers,
  IconEye,
  IconProgress,
  IconClipboardList,
  IconFileText,
  IconMail,
  IconPhone,
} from '@tabler/icons-react'

const InstructorStudents = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get('batch') || '')
  
  const { data: batchesData } = useGetInstructorAssignedBatchesQuery({ limit: 100 })
  const { data, isLoading, error } = useGetInstructorBatchStudentsQuery(
    selectedBatchId, 
    { skip: !selectedBatchId }
  )
  
  const students = data?.data?.students || []
  const batch = data?.data?.batch
  const batches = batchesData?.data?.batches || []

  useEffect(() => {
    const batchFromParams = searchParams.get('batch')
    if (batchFromParams && batchFromParams !== selectedBatchId) {
      setSelectedBatchId(batchFromParams)
    }
  }, [searchParams, selectedBatchId])

  const handleBatchChange = (batchId) => {
    setSelectedBatchId(batchId)
    if (batchId) {
      setSearchParams({ batch: batchId })
    } else {
      setSearchParams({})
    }
  }

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 60) return 'text-yellow-600'
    if (progress >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  if (isLoading && selectedBatchId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {batch?.name ? `${batch.name} - Students` : 'Student Management'}
          </h1>
          <p className="text-muted-foreground">
            View and monitor student progress and performance
          </p>
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={selectedBatchId} onValueChange={handleBatchChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => (
                <SelectItem key={batch._id} value={batch._id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedBatchId ? (
        <Card className="p-12">
          <div className="text-center">
            <IconUsers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Batch</h3>
            <p className="text-muted-foreground">
              Choose a batch from your assigned batches to view student data.
            </p>
          </div>
        </Card>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load students</p>
        </div>
      ) : (
        <>
          {/* Students Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Students ({students.length})</CardTitle>
                <Badge variant="outline">
                  <IconEye className="h-3 w-3 mr-1" />
                  Read-only View
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Quiz Scores</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              @{student.userName}
                            </p>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <IconMail className="h-3 w-3 mr-2" />
                              {student.email}
                            </div>
                            {student.phoneNumber && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <IconPhone className="h-3 w-3 mr-2" />
                                {student.phoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${student.progress || 0}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getProgressColor(student.progress || 0)}`}>
                              {student.progress || 0}%
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            <p>Avg: {student.averageQuizScore || 'N/A'}</p>
                            <p className="text-muted-foreground">
                              {student.completedQuizzes || 0}/{student.totalQuizzes || 0} completed
                            </p>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            <p>{student.submittedAssignments || 0}/{student.totalAssignments || 0}</p>
                            <p className="text-muted-foreground">submitted</p>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={student.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {student.status || 'ACTIVE'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <IconUsers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                  <p className="text-muted-foreground">
                    This batch doesn't have any enrolled students yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Read-only Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <IconEye className="h-3 w-3 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900">Read-Only Access</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You can view student information, progress, quiz attempts, and assignment submissions 
                    but cannot make any modifications or grade assignments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
};

export default InstructorStudents;


