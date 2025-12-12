import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import User from '../models/auth.model.js';
import Course from '../models/course.model.js';
import Department from '../models/department.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const sendExcel = async (res, filename, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  worksheet.columns = columns.map(col => ({ header: col.header, key: col.key, width: col.width || 20 }));
  rows.forEach(r => worksheet.addRow(r));
  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.status(200).send(Buffer.from(buffer));
};

const sendPDF = (res, filename, title, columns, rows) => {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);

  const colWidths = columns.map(c => c.width || 100);
  const colHeaders = columns.map(c => c.header);

  const drawRow = (vals, isHeader = false) => {
    const y = doc.y;
    let x = doc.page.margins.left;
    vals.forEach((val, idx) => {
      const w = colWidths[idx];
      const text = (val ?? '').toString();
      if (isHeader) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      doc.text(text, x, y, { width: w, continued: false });
      x += w + 8;
    });
    doc.moveDown(0.5);
    if (isHeader) doc.moveDown(0.2);
  };

  drawRow(colHeaders, true);
  rows.forEach(r => drawRow(columns.map(c => r[c.key] ?? '')));

  doc.end();
};

export const exportCourses = asyncHandler(async (req, res) => {
  const { format = 'excel', search = '', status = '', category = '' } = req.query;

  const query = { isDeleted: { $ne: true } };
  if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  if (status) query.status = status;
  if (category) query.category = category;

  const courses = await Course.find(query)
    .populate('instructor', 'fullName email')
    .select('title category difficulty status totalEnrollments instructor createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Difficulty', key: 'difficulty', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Instructor', key: 'instructorName', width: 24 },
    { header: 'Enrollments', key: 'totalEnrollments', width: 12 },
    { header: 'Created At', key: 'createdAt', width: 22 },
  ];

  const rows = courses.map(c => ({
    title: c.title,
    category: c.category,
    difficulty: c.difficulty,
    status: c.status,
    instructorName: c.instructor?.fullName || '',
    totalEnrollments: c.totalEnrollments || 0,
    createdAt: new Date(c.createdAt).toISOString(),
  }));

  const filename = `courses_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'pdf') return sendPDF(res, filename, 'Courses Export', columns, rows);
  return sendExcel(res, filename, columns, rows);
});

export const exportDepartments = asyncHandler(async (req, res) => {
  const { format = 'excel', search = '', status = '' } = req.query;
  const query = { isDeleted: { $ne: true } };
  if (search) query.name = { $regex: search, $options: 'i' };
  if (status) query.status = status;

  const departments = await Department.find(query)
    .populate('course', 'title')
    .populate('instructor', 'fullName email')
    .select('name course instructor status startDate endDate capacity students createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const columns = [
    { header: 'Department Name', key: 'name', width: 28 },
    { header: 'Course', key: 'courseTitle', width: 28 },
    { header: 'Instructor', key: 'instructorName', width: 24 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Start Date', key: 'startDate', width: 18 },
    { header: 'End Date', key: 'endDate', width: 18 },
    { header: 'Capacity', key: 'capacity', width: 10 },
    { header: 'Students', key: 'studentCount', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 22 },
  ];

  const rows = departments.map(b => ({
    name: b.name,
    courseTitle: b.course?.title || '',
    instructorName: b.instructor?.fullName || '',
    status: b.status,
    startDate: b.startDate ? new Date(b.startDate).toISOString().slice(0, 10) : '',
    endDate: b.endDate ? new Date(b.endDate).toISOString().slice(0, 10) : '',
    capacity: b.capacity || 0,
    studentCount: b.students?.length || 0,
    createdAt: new Date(b.createdAt).toISOString(),
  }));

  const filename = `departments_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'pdf') return sendPDF(res, filename, 'Departments Export', columns, rows);
  return sendExcel(res, filename, columns, rows);
});

export const exportStudents = asyncHandler(async (req, res) => {
  const { format = 'excel', search = '', status = '', departmentId = '' } = req.query;

  const query = { role: 'STUDENT', isDeleted: { $ne: true } };
  if (search) query.$or = [
    { fullName: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { userName: { $regex: search, $options: 'i' } },
  ];
  if (status) query.status = status;

  if (req.user.role === 'INSTRUCTOR') {
    const instructor = await User.findById(req.user._id).select('departments');
    const allowed = instructor?.departments || [];
    if (!allowed.length) {
      const columns = [
        { header: 'Full Name', key: 'fullName', width: 26 },
        { header: 'Username', key: 'userName', width: 20 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Phone', key: 'phoneNumber', width: 16 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Department', key: 'departmentName', width: 22 },
        { header: 'Created At', key: 'createdAt', width: 22 },
      ];
      const filename = `students_${new Date().toISOString().slice(0, 10)}`;
      if (format === 'pdf') return sendPDF(res, filename, 'Students Export', columns, []);
      return sendExcel(res, filename, columns, []);
    }
    query.department = { $in: allowed };
  } else if (departmentId) {
    query.department = departmentId;
  }

  const students = await User.find(query)
    .select('fullName userName email phoneNumber status department createdAt')
    .populate('department', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const columns = [
    { header: 'Full Name', key: 'fullName', width: 26 },
    { header: 'Username', key: 'userName', width: 20 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phoneNumber', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Department', key: 'departmentName', width: 22 },
    { header: 'Created At', key: 'createdAt', width: 22 },
  ];

  const rows = students.map(s => ({
    fullName: s.fullName,
    userName: s.userName,
    email: s.email,
    phoneNumber: s.phoneNumber,
    status: s.status,
    departmentName: s.department?.name || '',
    createdAt: new Date(s.createdAt).toISOString(),
  }));

  const filename = `students_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'pdf') return sendPDF(res, filename, 'Students Export', columns, rows);
  return sendExcel(res, filename, columns, rows);
});
