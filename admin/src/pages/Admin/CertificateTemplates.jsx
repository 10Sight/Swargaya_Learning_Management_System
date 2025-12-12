import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useGetCertificateTemplatesQuery,
  useDeleteCertificateTemplateMutation,
  useSetDefaultCertificateTemplateMutation,
  useCreateCertificateTemplateMutation,
  useUpdateCertificateTemplateMutation
} from '@/Redux/AllApi/CertificateTemplateApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Award,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Star,
  Copy,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

const CertificateTemplates = () => {

  const navigate = useNavigate()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    styles: '',
    isDefault: false
  })

  // API calls with proper error handling
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useGetCertificateTemplatesQuery()

  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteCertificateTemplateMutation()
  const [setDefaultTemplate, { isLoading: isSettingDefault }] = useSetDefaultCertificateTemplateMutation()
  const [createTemplate, { isLoading: isCreating }] = useCreateCertificateTemplateMutation()
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateCertificateTemplateMutation()

  // Extract templates from response
  const templates = response?.data || []

  // Default templates
  const defaultTemplateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Completion</title>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1>Certificate of Completion</h1>
        </div>
        
        <div class="content">
            <p class="intro">This is to certify that</p>
            <h2 class="student-name">{{studentName}}</h2>
            <p class="completion-text">has successfully completed the course</p>
            <h3 class="course-name">{{courseName}}</h3>
            <p class="department-info">in department <strong>{{departmentName}}</strong></p>
            <p class="level-info">achieving level <strong>{{level}}</strong></p>
            <p class="grade-info">with grade <strong>{{grade}}</strong></p>
        </div>
        
        <div class="footer">
            <div class="signature-section">
                <div class="signature">
                    <p class="instructor-name">{{instructorName}}</p>
                    <hr class="signature-line">
                    <p class="signature-label">Instructor Signature</p>
                </div>
            </div>
            <p class="date">Issued on {{issueDate}}</p>
        </div>
    </div>
</body>
</html>`

  const defaultStyles = `.certificate {
    width: 800px;
    margin: 0 auto;
    padding: 60px 80px;
    border: 10px solid #2c3e50;
    border-radius: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-family: 'Georgia', serif;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.header h1 {
    font-size: 48px;
    margin-bottom: 30px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    letter-spacing: 2px;
}

.content {
    margin: 40px 0;
}

.intro {
    font-size: 24px;
    margin-bottom: 20px;
    font-style: italic;
}

.student-name {
    font-size: 42px;
    margin: 30px 0;
    color: #f1c40f;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 3px;
}

.completion-text {
    font-size: 20px;
    margin: 20px 0;
}

.course-name {
    font-size: 32px;
    margin: 25px 0;
    color: #ecf0f1;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.department-info, .level-info, .grade-info {
    font-size: 18px;
    margin: 15px 0;
}

.footer {
    margin-top: 50px;
    position: relative;
}

.signature-section {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.signature {
    text-align: center;
    width: 250px;
}

.instructor-name {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
}

.signature-line {
    border: none;
    border-top: 2px solid white;
    width: 100%;
    margin: 10px 0;
}

.signature-label {
    font-size: 14px;
    font-style: italic;
}

.date {
    font-size: 16px;
    font-style: italic;
    position: absolute;
    bottom: 0;
    right: 0;
}

.media print {
    .certificate {
        border: 8px solid #2c3e50;
        box-shadow: none;
    }
}`

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.template.trim()) {
      toast.error('Please fill in required fields: Name and Template')
      return
    }

    try {
      const result = await createTemplate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        template: formData.template || defaultTemplateHtml,
        styles: formData.styles || defaultStyles,
        isDefault: formData.isDefault
      }).unwrap()

      if (result.success) {
        toast.success('Template created successfully')
        setShowCreateDialog(false)
        setFormData({
          name: '',
          description: '',
          template: '',
          styles: '',
          isDefault: false
        })
        refetch() // Refresh the list
      } else {
        toast.error(result.message || 'Failed to create template')
      }
    } catch (error) {
      console.error('Create template error:', error)
      toast.error(error?.data?.message || 'Failed to create template')
    }
  }

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) return

    try {
      const result = await deleteTemplate(templateId).unwrap()
      if (result.success) {
        toast.success('Template deleted successfully')
        refetch() // Refresh the list
      } else {
        toast.error(result.message || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Delete template error:', error)
      toast.error(error?.data?.message || 'Failed to delete template')
    }
  }

  const handleSetDefault = async (templateId) => {
    try {
      const result = await setDefaultTemplate(templateId).unwrap()
      if (result.success) {
        toast.success('Default template updated successfully')
        refetch() // Refresh the list to update default status
      } else {
        toast.error(result.message || 'Failed to set default template')
      }
    } catch (error) {
      console.error('Set default error:', error)
      toast.error(error?.data?.message || 'Failed to set default template')
    }
  }

  const handlePreview = (template) => {
    try {
      if (!template?.template) {
        toast.error('Template content is empty or invalid')
        return
      }

      const sampleData = {
        studentName: 'John Doe',
        courseName: 'Advanced Web Development',
        departmentName: 'Spring 2024',
        instructorName: 'Dr. Sarah Johnson',
        level: 'L3',
        grade: 'A+',
        issueDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      // Simple and safe replacement
      let previewContent = template.template.toString()
      const templateStyles = template.styles || defaultStyles

      // Replace placeholders with sample data
      Object.keys(sampleData).forEach(key => {
        const placeholder = `{{${key}}}`
        const value = sampleData[key]
        previewContent = previewContent.split(placeholder).join(value)
      })

      // Clean any remaining placeholders
      previewContent = previewContent.replace(/\{\{.*?\}\}/g, 'Sample Data')

      const finalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate Preview</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: Arial, sans-serif; 
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .preview-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    ${templateStyles}
  </style>
</head>
<body>
  <div class="preview-container">
    ${previewContent}
  </div>
</body>
</html>`

      setPreviewHtml(finalHtml)
      setShowPreviewDialog(true)
    } catch (error) {
      console.error('Preview generation error:', error)
      toast.error('Failed to generate preview. Please check the template format.')
    }
  }

  const handleCopyTemplate = (template) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      template: template.template || defaultTemplateHtml,
      styles: template.styles || defaultStyles,
      isDefault: false
    })
    setShowCreateDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      template: defaultTemplateHtml,
      styles: defaultStyles,
      isDefault: false
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col space-y-2">
            <span>Failed to load certificate templates</span>
            <span className="text-sm">
              Error: {error?.data?.message || error?.message || 'Unknown error occurred'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="mt-2 w-fit"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" />
            Certificate Templates
          </h1>
          <p className="text-muted-foreground">
            Manage certificate templates for course completion certificates
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Certificate Template</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter template description"
                />
              </div>
              <div>
                <Label htmlFor="template">HTML Template *</Label>
                <Textarea
                  id="template"
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder="Enter HTML template with placeholders"
                  className="h-64 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use placeholders: {'{{studentName}}'}, {'{{courseName}}'}, {'{{departmentName}}'}, {'{{instructorName}}'}, {'{{level}}'}, {'{{grade}}'}, {'{{issueDate}}'}
                </p>
              </div>
              <div>
                <Label htmlFor="styles">CSS Styles</Label>
                <Textarea
                  id="styles"
                  value={formData.styles}
                  onChange={(e) => setFormData({ ...formData, styles: e.target.value })}
                  placeholder="Enter CSS styles for the template"
                  className="h-32 font-mono text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Set as default template
                </Label>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={isCreating || !formData.name.trim() || !formData.template.trim()}
                >
                  {isCreating ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Certificate Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{template.name}</span>
                        {template.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                        {template.description || 'No description provided'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyTemplate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {!template.isDefault && (
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(template._id)}
                              disabled={isSettingDefault}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              {isSettingDefault ? 'Setting...' : 'Set as Default'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template._id, template.name)}
                            className="text-destructive focus:text-destructive"
                            disabled={template.isDefault || isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by creating your first certificate template for course completion certificates.
              </p>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 border rounded-lg bg-white overflow-hidden" style={{ minHeight: '500px', height: '70vh' }}>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              title="Certificate Preview"
              loading="eager"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowPreviewDialog(false)}>
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CertificateTemplates