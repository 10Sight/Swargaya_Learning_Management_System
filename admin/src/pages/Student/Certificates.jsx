import React, { useState } from 'react'
import { useGetStudentCertificatesQuery } from '@/Redux/AllApi/CertificateApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Award, 
  Download, 
  Eye, 
  Calendar,
  GraduationCap,
  FileText,
  Printer
} from 'lucide-react'
import { toast } from 'sonner'

const Certificates = () => {
  const [selectedCertificate, setSelectedCertificate] = useState(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  
  const { data, isLoading, error } = useGetStudentCertificatesQuery()
  
  const certificates = data?.data || []

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getGradeBadgeColor = (grade) => {
    if (!grade) return 'bg-gray-100 text-gray-800';
    
    switch(grade.toString().toUpperCase()) {
      case 'A+': 
      case 'A': return 'bg-green-100 text-green-800'
      case 'B+':
      case 'B': return 'bg-blue-100 text-blue-800'
      case 'C+':
      case 'C': return 'bg-yellow-100 text-yellow-800'
      case 'PASS': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate)
    setShowPreviewDialog(true)
  }

  const handleDownloadCertificate = (certificate) => {
    // Generate the certificate HTML with styles for download/print
    const certificateData = certificate.metadata || {}
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate - ${certificateData.studentName || 'Hello'}</title>
        <style>
          ${certificateData.styles || ''}
          @media print {
            body { margin: 0; }
            .certificate { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        ${certificateData.generatedHTML || '<p>Certificate content not available</p>'}
      </body>
      </html>
    `
    
    // Create a blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `certificate-${certificate.course?.title || 'course'}-${certificate.student?.fullName || 'student'}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Certificate downloaded successfully!')
  }

  const handlePrintCertificate = (certificate) => {
    const certificateData = certificate.metadata || {}
    const printContent = `
      <style>
        ${certificateData.styles || ''}
        @media print {
          body { margin: 0; }
          .certificate { box-shadow: none; }
        }
      </style>
      ${certificateData.generatedHTML || '<p>Certificate content not available</p>'}
    `
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate</title>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Failed to load certificates: {error?.data?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Award className="h-8 w-8 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your earned course completion certificates
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mr-4">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{certificates.length}</p>
              <p className="text-sm text-muted-foreground">Total Certificates</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {certificates.filter(c => c.status === 'ACTIVE').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Certificates</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {certificates.length > 0 
                  ? new Date(Math.max(...certificates.map(c => new Date(c.issueDate)))).getFullYear()
                  : 'N/A'
                }
              </p>
              <p className="text-sm text-muted-foreground">Latest Year</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Grid */}
      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <Card key={certificate._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-6 mb-2">
                      {certificate.course?.title || 'Course Certificate'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>Issued: {formatDate(certificate.issueDate)}</span>
                    </div>
                  </div>
                  <Badge className={getGradeBadgeColor(certificate.grade)}>
                    {certificate.grade || 'PASS'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Instructor:</span>
                    <span className="font-medium">
                      {certificate.issuedBy?.fullName || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={certificate.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {certificate.status}
                    </Badge>
                  </div>
                  
                  {certificate.expiryDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">
                        {formatDate(certificate.expiryDate)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewCertificate(certificate)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePrintCertificate(certificate)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadCertificate(certificate)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Award className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete your courses to earn certificates that showcase your achievements!
            </p>
            <Button 
              onClick={() => window.location.href = '/student/course'}
              variant="outline"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Certificate Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Certificate - {selectedCertificate?.course?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            {selectedCertificate?.metadata?.generatedHTML ? (
              <div dangerouslySetInnerHTML={{ 
                __html: `
                  <style>${selectedCertificate.metadata.styles || ''}</style>
                  ${selectedCertificate.metadata.generatedHTML}
                `
              }} />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Certificate preview not available</p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => handlePrintCertificate(selectedCertificate)}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => handleDownloadCertificate(selectedCertificate)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Certificates
