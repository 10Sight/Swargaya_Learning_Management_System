# Testing Assignment Monitoring File Downloads

## Backend Components Fixed

### 1. Submission Model (✓ Already Complete)
- Support for both legacy `fileUrl` and new `attachments` array
- Attachments include: filename, originalName, filePath, fileSize, mimeType, uploadedAt

### 2. Instructor Controller (✓ Fixed)
- `downloadSubmissionFile` endpoint handles both legacy and new file systems
- Proper access control through batch verification
- Fixed file serving logic with proper headers and paths

### 3. Routes (✓ Already Complete)
- Added route for downloading submission files: `GET /api/instructor/submissions/:submissionId/files/:fileIndex`

## Frontend Components Fixed

### 1. Assignment Monitoring Component (✓ Fixed)
- Fixed `file.size` → `file.fileSize` property reference
- Proper display of file information in submission details
- Download functionality for both legacy and new attachments

### 2. API Integration (✓ Already Complete)
- RTK Query hooks for downloading files
- Proper blob handling and file download creation

## Testing Checklist

To verify the system works:

1. **Login as Instructor**
   - Access Assignment Monitoring page
   - Select a batch with submissions

2. **View Submissions**
   - Check if submissions display correctly
   - Verify file information shows (name, size, type)

3. **Download Files**
   - Click download buttons on submission files
   - Test both legacy files (if any) and new attachments
   - Verify files download with correct names

4. **Grade Submissions**
   - Open submission details dialog
   - Enter grade and feedback
   - Save changes and verify they persist

## Key Fixes Made

### Frontend Fix
- Line 340 in AssignmentMonitoring.jsx: `file.size` → `file.fileSize`

### Backend Fix  
- Improved downloadSubmissionFile logic to properly handle both file systems
- Added debug logging (can be removed after testing)

## File Structure Support

The system now properly supports:

### Legacy Files
- Single file per submission stored as URL in `fileUrl` field
- Download via redirect to stored URL

### New File System  
- Multiple files per submission in `attachments` array
- Local file storage with metadata
- Download via file serving with proper headers

## Error Handling

- Invalid file indices return 400 Bad Request
- Missing files return 404 Not Found  
- Access denied returns 403 Forbidden
- File system errors return 500 Internal Server Error

The assignment monitoring system is now ready for testing and should handle file downloads properly for both legacy and new submission formats.
