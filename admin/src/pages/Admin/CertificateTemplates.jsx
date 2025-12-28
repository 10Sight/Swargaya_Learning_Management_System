import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    <title>DOJO Certificate</title>
</head>
<body>
    <div class="certificate-container">
        <!-- Header Section -->
        <div class="header">
            <div class="header-text">
                <h1>CERTIFICATION</h1>
                <h2>THIS IS TO CERTIFY THAT</h2>
            </div>
            <div class="brand-logo">
                <img src="/motherson+marelli.png" alt="Marelli Motherson" />
            </div>
        </div>

        <!-- Candidate Details -->
        <div class="candidate-info">
            <p>
                <span class="label">Mr. / Mrs.</span>
                <span class="underline field-name">{{studentName}}</span>
                <span class="label">Department</span>
                <span class="underline field-dept">{{departmentName}}</span>
                <span class="label">Employee ID</span>
                <span class="underline field-id">{{employeeId}}</span>
            </p>
            <p>
                <span class="label">who had started his/her training from (</span>
                <span class="underline field-date">{{startDate}}</span>
                <span class="label">) to (</span>
                <span class="underline field-date">{{completionDate}}</span>
                <span class="label">)</span>
            </p>
            <p class="training-declaration">
                has successfully completed ( Integrated/ Refresher ) course through the following DOJO Gates.
            </p>
        </div>

        <!-- Levels Table Section -->
        <div class="levels-container">
            <div class="level-header">Current Level</div>
            
            <div class="main-grid">
                <!-- Left Column: Levels Description -->
                <div class="levels-table">
                    <div class="table-row header-row">
                        <div class="col-level">Level</div>
                        <div class="col-date">Level Certified Date</div>
                    </div>
                    <!-- Level 1 -->
                    <div class="table-row">
                        <div class="col-level lvl-grey">Level-1</div>
                        <div class="col-date">{{level1Date}}</div>
                    </div>
                    <!-- Level 2 -->
                    <div class="table-row">
                        <div class="col-level lvl-yellow">Level-2</div>
                        <div class="col-date">{{level2Date}}</div>
                    </div>
                    <!-- Level 3 -->
                    <div class="table-row">
                        <div class="col-level lvl-orange">Level-3</div>
                        <div class="col-date">{{level3Date}}</div>
                    </div>
                    <!-- Level 4 -->
                    <div class="table-row">
                        <div class="col-level lvl-blue">Level-4</div>
                        <div class="col-date">{{level4Date}}</div>
                    </div>
                    <!-- Level 5 -->
                    <div class="table-row">
                        <div class="col-level lvl-green">Level-5</div>
                        <div class="col-date">{{level5Date}}</div>
                    </div>
                </div>

                <!-- Right Column: Visualization -->
                <div class="visual-section">
                    <div class="blue-box"></div>
                    <div class="chart-box">
                        <!-- Simple CSS Pie Chart Representation -->
                        <div class="pie-chart"></div>
                    </div>
                    <div class="skill-level-text">
                        Current Skill Level - {{level}}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer / Review Section -->
        <div class="footer-table">
            <div class="note-col">
                Note:- Review Frequency after 3 month
            </div>
            <div class="review-col">
                <div class="review-header">
                    <div class="r-cell"></div>
                    <div class="r-cell"></div>
                </div>
                <div class="review-body">
                    <div class="r-cell">1st Review</div>
                    <div class="r-cell">4th review</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`

  const defaultStyles = `* {
    box-sizing: border-box;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 0;
    padding: 0;
}

.certificate-container {
    width: 800px;
    margin: 0 auto;
    border: 2px solid #000;
    background-color: #fff9e6; /* Light yellow background */
    position: relative;
}

/* Header */
.header {
    background-color: #2b78c5; /* Blue header */
    color: white;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    border-bottom: 2px solid #000;
}

.header-text {
    text-align: center;
}

.header h1 {
    margin: 0;
    font-size: 32px;
    font-weight: bold;
    text-transform: uppercase;
}

.header h2 {
    margin: 5px 0 0 0;
    font-size: 24px;
    font-weight: bold;
    color: #000;
}

.brand-logo {
    position: absolute;
    right: 10px;
    top: 5px;
    background: white;
    padding: 5px;
}

.brand-logo img {
    height: 60px;
    width: auto;
}

/* Candidate Info */
.candidate-info {
    padding: 20px 30px;
    font-weight: bold;
    font-size: 14px;
    line-height: 1.8;
}

.label {
    margin-right: 5px;
}

.underline {
    display: inline-block;
    border-bottom: 1px solid #000;
    padding: 0 10px;
    margin-right: 15px;
    min-width: 50px;
    text-align: center;
}

.field-name { min-width: 200px; }
.field-dept { min-width: 150px; }
.field-id { min-width: 100px; }
.field-date { min-width: 80px; }

.training-declaration {
    margin-top: 15px;
}

/* Levels Table Grid */
.levels-container {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    background-color: #dbebf7; /* Light blueish background */
}

.level-header {
    text-align: center;
    font-weight: bold;
    font-size: 18px;
    padding: 8px;
    border-bottom: 2px solid #000;
}

.main-grid {
    display: flex;
}

.levels-table {
    width: 50%;
    border-right: 2px solid #000;
}

.table-row {
    display: flex;
    border-bottom: 1px solid #000;
    height: 45px;
}

.table-row:last-child {
    border-bottom: none;
}

.header-row {
    font-weight: bold;
    background-color: #dbebf7;
    height: 35px;
    align-items: center;
}

.col-level {
    width: 35%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border-right: 1px solid #000;
    height: 100%;
}

.col-date {
    width: 65%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

/* Level Colors */
.lvl-grey { background-color: #bfbfbf; }
.lvl-yellow { background-color: #ffff00; }
.lvl-orange { background-color: #ffc000; }
.lvl-blue { background-color: #00b0f0; }
.lvl-green { background-color: #00b050; }

/* Visual Section */
.visual-section {
    width: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.blue-box {
    width: 120px;
    height: 120px;
    background-color: #5b9bd5;
    border-radius: 15px;
    border: 1px solid #333;
    margin-bottom: 20px;
}

.chart-box {
    width: 80px;
    height: 80px;
    background: white;
    border: 1px solid #333;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
}

.pie-chart {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: conic-gradient(black 0% 25%, white 25% 100%); /* Static pie chart example */
    border: 1px solid black;
}

.skill-level-text {
    font-weight: bold;
    font-size: 16px;
}

/* Footer Table */
.footer-table {
    display: flex;
    height: 60px;
}

.note-col {
    width: 50%;
    border-right: 2px solid #000;
    display: flex;
    align-items: center;
    padding-left: 10px;
    font-weight: bold;
    font-size: 14px;
}

.review-col {
    width: 50%;
    display: flex;
    flex-direction: column;
}

.review-header, .review-body {
    display: flex;
    height: 50%;
}

.review-header {
    border-bottom: 1px solid #000;
}

.r-cell {
    width: 50%;
    border-right: 1px solid #000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 12px;
}

.r-cell:last-child {
    border-right: none;
}
`

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
        employeeId: 'EMP-2024-001',
        startDate: '01/01/2024',
        completionDate: '31/03/2024',
        level1Date: '15/01/2024',
        level2Date: '15/02/2024',
        level3Date: 'Pending',
        level4Date: '',
        level5Date: '',
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
      align-items: flex-start;
      min-height: 100vh;
      overflow: auto;
    }
    .preview-container {
      background: white;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.15);
      /* Transform to fit if needed, but centering is key */
      transform: scale(0.70);
      transform-origin: center top;
      margin-top: 20px;
    }
    /* Ensure certificate class doesn't override container behavior unless specific */
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

      {/* Custom Full Screen Preview Dialog - Rendered via Portal to be top-level */}
      {showPreviewDialog && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop with "half glass blurred" effect (strong blur) */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xl transition-all duration-200"
            onClick={() => setShowPreviewDialog(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] bg-white/95 shadow-2xl rounded-xl overflow-hidden flex flex-col border border-white/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-xl font-semibold text-gray-800">Certificate Preview</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreviewDialog(false)}
                className="hover:bg-gray-100 rounded-full h-8 w-8"
              >
                <span className="sr-only">Close</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 opacity-70"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6 18 18" />
                </svg>
              </Button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center">
              <div
                className="w-full h-full bg-white shadow-sm border rounded-lg overflow-hidden flex items-center justify-center"
                style={{ minHeight: '100%' }}
              >
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                  title="Certificate Preview"
                  loading="eager"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white/50 flex justify-end gap-3 backdrop-blur-sm">
              <Button
                variant="outline"
                onClick={() => setShowPreviewDialog(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default CertificateTemplates