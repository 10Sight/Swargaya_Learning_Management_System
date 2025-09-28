import React, { useState } from 'react'
import { useGetInstructorBatchAssignmentSubmissionsQuery, useGetInstructorAssignedBatchesQuery } from '@/Redux/AllApi/InstructorApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
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
  IconClipboard,
  IconEye,
  IconUser,
  IconClock,
  IconCheck,
  IconExternalLink,
  IconFile,
  IconCalendar,
} from '@tabler/icons-react'

const AssignmentMonitoring = () => {
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const { data: batchesData } = useGetInstructorAssignedBatchesQuery({ limit: 100 })
  const { data, isLoading, error } = useGetInstructorBatchAssignmentSubmissionsQuery(
    { batchId: selectedBatchId }, 
    { skip: !selectedBatchId }
  )

  const submissions = data?.data?.submissions || []
  const batches = batchesData?.data?.batches || []

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="info"><IconCheck className="h-3 w-3 mr-1" />Submitted</Badge>
      case 'GRADED':
        return <Badge variant="success"><IconCheck className="h-3 w-3 mr-1" />Graded</Badge>
      case 'LATE':
        return <Badge variant="destructive"><IconClock className="h-3 w-3 mr-1" />Late</Badge>
      case 'PENDING':
        return <Badge variant="warning"><IconClock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getGradeColor = (grade, maxGrade) => {
    if (!maxGrade || grade === null) return 'text-gray-500'
    const percentage = (grade / maxGrade) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Assignment Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor student assignment submissions and progress across your batches
          </p>
        </div>
        <Badge variant="outline">
          <IconEye className="h-3 w-3 mr-1" />
          Read-only View
        </Badge>
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
              <IconClipboard className="h-3 w-3 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-amber-900">Assignment Monitoring</h3>
              <p className="text-sm text-amber-700 mt-1">
                You can view assignment submissions, grades, and student progress but cannot create, 
                edit, or grade assignments. Select a batch to view assignment data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a batch to view assignment data" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => (
                <SelectItem key={batch._id} value={batch._id}>
                  {batch.name} - {batch.students?.length || 0} students
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedBatchId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <IconClipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Batch</h3>
            <p className="text-muted-foreground">
              Choose a batch from your assigned batches to view assignment monitoring data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignment Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : submissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission._id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <IconUser className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{submission.student?.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              @{submission.student?.userName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium">{submission.assignment?.title}</p>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                            <IconCalendar className="h-3 w-3" />
                            <span>Due: {new Date(submission.assignment?.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(submission.status)}
                      </TableCell>
                      
                      <TableCell>
                        {submission.grade !== null && submission.assignment?.maxGrade ? (
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${getGradeColor(submission.grade, submission.assignment.maxGrade)}`}>
                              {submission.grade}/{submission.assignment.maxGrade}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((submission.grade / submission.assignment.maxGrade) * 100)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not graded</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {submission.submittedAt ? (
                          <div>
                            <p className="text-sm">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(submission.submittedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not submitted</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {submission.attachments?.length > 0 ? (
                          <div className="space-y-1">
                            {submission.attachments.map((file, index) => (
                              <div key={index} className="flex items-center space-x-1 text-sm">
                                <IconFile className="h-3 w-3" />
                                <span className="truncate max-w-32">{file.filename}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({formatFileSize(file.size)})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No files</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" disabled>
                            <IconEye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <IconClipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Assignment Submissions</h3>
                <p className="text-muted-foreground">
                  No assignment submissions found for the selected batch.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AssignmentMonitoring
