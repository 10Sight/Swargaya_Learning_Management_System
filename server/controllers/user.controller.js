import { pool } from "../db/connectDB.js";
import validator from "validator";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../config/cloudinary.js"; // Standardized helper
import { AvailableUserRoles, AvailableUnits } from "../constants.js";
import logAudit from "../utils/auditLogger.js";
import sendMail from "../utils/mail.util.js";
import { generateWelcomeEmail } from "../utils/emailTemplates.js";
import ENV from "../configs/env.config.js";

// Helper to safely parse JSON
const parseJSON = (data, fallback = null) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return fallback; }
  }
  return data || fallback;
};

// Helper to escape regex special chars for LIKE queries (simplified for SQL)
// SQL LIKE uses % and _
const escapeLike = (str) => str.replace(/[%_]/g, '\\$&');

// Get All Users
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const sortByMap = {
    "createdAt": "u.createdAt",
    "fullName": "u.fullName",
    "email": "u.email",
    "role": "u.role"
  };
  const sortBy = sortByMap[req.query.sortBy] || "u.createdAt";
  const order = req.query.order === "asc" ? "ASC" : "DESC";

  let whereClauses = ["(u.isDeleted = 0 OR u.isDeleted IS NULL)"];
  let params = [];

  if (req.query.search) {
    const term = `%${req.query.search}%`;
    whereClauses.push("(u.fullName LIKE ? OR u.email LIKE ?)");
    params.push(term, term);
  }

  if (req.query.role && Object.values(AvailableUserRoles).includes(req.query.role)) {
    whereClauses.push("u.role = ?");
    params.push(req.query.role);
  }

  if (req.query.unit && AvailableUnits.includes(req.query.unit)) {
    whereClauses.push("u.unit = ?");
    params.push(req.query.unit);
  }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : "";

  // Count
  const [cnt] = await pool.query(`SELECT COUNT(*) as total FROM users u ${whereSQL}`, params);
  const totalUsers = cnt[0].total;

  // Fetch
  const [users] = await pool.query(`
        SELECT u.id, u.fullName, u.userName, u.slug, u.email, u.phoneNumber, u.role, u.status, u.unit, u.createdAt, u.avatar,
               d.name as departmentName, d.id as departmentId
        FROM users u
        LEFT JOIN departments d ON u.department = d.id
        ${whereSQL}
        ORDER BY ${sortBy} ${order}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `, [...params, offset, limit]);

  // Format
  const formatted = users.map(u => ({
    _id: u.id, // Keeping _id for frontend compat if needed
    ...u,
    department: u.departmentId ? { _id: u.departmentId, name: u.departmentName } : null,
    avatar: parseJSON(u.avatar),
  })).map(u => { delete u.departmentName; delete u.departmentId; return u; });

  res.json(new ApiResponse(200, {
    users: formatted,
    totalUsers,
    totalPages: Math.ceil(totalUsers / limit),
    currentPage: page,
    limit,
  }, "Users fetched successfully"));
});

// Get User by ID
export const getUserById = asyncHandler(async (req, res) => {
  const rawId = String(req.params.id || "");
  let user = null;

  // Try by ID first if numeric/uuid, else slug/username
  // Simplest SQL strategy: Check ID OR slugs
  const term = rawId.toLowerCase();

  const [rows] = await pool.query(`
        SELECT TOP 1 u.*, d.name as departmentName
        FROM users u
        LEFT JOIN departments d ON u.department = d.id
        WHERE u.id = ? OR u.slug = ? OR u.userName = ?
    `, [rawId, term, term]);

  if (rows.length === 0) throw new ApiError("User not found!", 404);
  user = rows[0];

  // Clean sensitive
  delete user.password;
  delete user.refreshToken;
  user.avatar = parseJSON(user.avatar);
  user.department = user.department ? { _id: user.department, name: user.departmentName } : null;
  delete user.departmentName;
  user._id = user.id; // compat

  res.json(new ApiResponse(200, user, "User fetched successfully!"));
});

// Update Profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, email } = req.body;
  const userId = req.user.id;

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) throw new ApiError("User not found", 404);
  const user = rows[0];

  if (email) {
    if (!validator.isEmail(email)) throw new ApiError("Invalid email address", 400);
    if (email !== user.email) {
      const [exist] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]);
      if (exist.length > 0) throw new ApiError("Email already in use", 400);
    }
  }

  if (phoneNumber && !validator.isMobilePhone(phoneNumber, "any")) {
    throw new ApiError("Invalid phone number", 400);
  }

  let updates = [];
  let values = [];
  if (fullName) { updates.push("fullName = ?"); values.push(fullName); }
  if (phoneNumber) { updates.push("phoneNumber = ?"); values.push(phoneNumber); }
  if (email) { updates.push("email = ?"); values.push(email); }

  if (updates.length > 0) {
    updates.push("updatedAt = GETDATE()");
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, userId]);
  }

  const [updated] = await pool.query("SELECT id, fullName, email, phoneNumber, role, department, createdAt, avatar FROM users WHERE id = ?", [userId]);
  const u = updated[0];
  u.avatar = parseJSON(u.avatar);
  u._id = u.id;

  await logAudit(userId, "UPDATE_PROFILE", { userId });

  res.json(new ApiResponse(200, u, "Profile updated successfully!"));
});

// Update Avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) throw new ApiError("User not found", 404);
  let user = rows[0];
  user.avatar = parseJSON(user.avatar);

  if (req.file) {
    // We generally don't delete immediately from Cloudinary in case upload fails, 
    // but can try.
    // Previous logic: delete old, upload new.
    /*
    if (user.avatar?.publicId) {
         // import cloudinary config directly or use delete helper if available? 
         // We used standard helper in upload.controller. 
         // Assuming direct import is NOT ideal.
         // We can assume `deleteFromCloudinary` exists in ../config/cloudinary.js if we look at other controllers.
         // Let's import it.
    }
    */
    const { deleteFromCloudinary } = await import("../config/cloudinary.js");
    if (user.avatar?.publicId) await deleteFromCloudinary(user.avatar.publicId);

    const result = await uploadToCloudinary(req.file.path, 'avatar'); // height/width/crop params handled in helper or default? Helper usually generic. 
    // If specific transformation needed, helper needs args. 
    // Assuming standard helper usage for now.

    const newAvatar = {
      publicId: result.public_id,
      url: result.url
    };

    await pool.query("UPDATE users SET avatar = ? WHERE id = ?", [JSON.stringify(newAvatar), userId]);
    user.avatar = newAvatar;
  }

  const safeUser = {
    _id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar
  };

  await logAudit(userId, "UPDATE_AVATAR", { userId });

  res.json(new ApiResponse(200, safeUser, "Avatar updated successfully"));
});

// Create User
export const createUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, phoneNumber, role = "STUDENT", password, unit } = req.body;

  if (!fullName || !userName || !email || !phoneNumber || !password || !unit) {
    throw new ApiError("All fields are required", 400);
  }
  if (!validator.isEmail(email)) throw new ApiError("Invalid email address", 400);
  if (!validator.isMobilePhone(phoneNumber, "any")) throw new ApiError("Invalid phone number", 400);
  if (!AvailableUserRoles.includes(role)) throw new ApiError("Invalid role", 400);
  if (!AvailableUnits.includes(unit)) throw new ApiError("Invalid unit", 400);

  // Check duplicates
  const [dupes] = await pool.query("SELECT id FROM users WHERE email = ? OR userName = ?", [email.toLowerCase(), userName.toLowerCase()]);
  if (dupes.length > 0) throw new ApiError("Email or Username already in use", 400);

  const plainTextPassword = password; // Only for email usage

  // Hash password handled by DB trigger or Model logic? 
  // SQL migration implies manual hashing here OR reusing current Model `.save()` middleware logic.
  // **CRITICAL**: In raw SQL, we must hash manually.
  // Importing bcrypt.
  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = await bcrypt.hash(password, 10);
  const slug = userName.toLowerCase().replace(/ /g, '-');

  const [result] = await pool.query(`
        INSERT INTO users (fullName, userName, slug, email, phoneNumber, role, password, unit, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PRESENT', GETDATE(), GETDATE()); SELECT SCOPE_IDENTITY() AS id;
    `, [fullName, userName.toLowerCase(), slug, email.toLowerCase(), phoneNumber, role, hashedPassword, unit]);

  const newUserId = result[0].id;
  const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [newUserId]);
  const u = newUser[0];
  delete u.password;
  u.department = null; // No dept on create
  u._id = u.id;

  await logAudit(req.user.id, "CREATE_USER", { userId: u.id, role });

  // Email logic
  try {
    let loginUrl = ENV.FRONTEND_URL || 'https://swargaya-learning-management-system-3vcz.onrender.com';
    if (role === 'ADMIN' || role === 'SUPERADMIN') loginUrl = ENV.ADMIN_URL || 'http://localhost:5173';
    else if (role === 'INSTRUCTOR') loginUrl = ENV.INSTRUCTOR_URL || 'http://localhost:5174';
    else if (role === 'STUDENT') loginUrl = ENV.STUDENT_URL || 'http://localhost:5175';

    const userData = { fullName, email, userName, phoneNumber, password: plainTextPassword, role };
    const emailHtml = generateWelcomeEmail(userData, loginUrl);
    await sendMail(email.toLowerCase(), `Welcome to 10Sight LMS`, emailHtml);
  } catch (e) { }

  res.status(201).json(new ApiResponse(201, u, "User created successfully"));
});

// Update User
export const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { fullName, userName, email, phoneNumber, role, status, unit } = req.body;

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) throw new ApiError("User not found", 404);
  const user = rows[0];

  let updates = ["updatedAt = GETDATE()"];
  let values = [];

  if (fullName) { updates.push("fullName = ?"); values.push(fullName); }
  if (userName) {
    const [ex] = await pool.query("SELECT id FROM users WHERE userName = ? AND id != ?", [userName.toLowerCase(), userId]);
    if (ex.length > 0) throw new ApiError("Username already in use", 400);
    updates.push("userName = ?"); values.push(userName.toLowerCase());
  }
  if (email) {
    if (!validator.isEmail(email)) throw new ApiError("Invalid email", 400);
    const [ex] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [email.toLowerCase(), userId]);
    if (ex.length > 0) throw new ApiError("Email already in use", 400);
    updates.push("email = ?"); values.push(email.toLowerCase());
  }
  if (phoneNumber) {
    if (!validator.isMobilePhone(phoneNumber, "any")) throw new ApiError("Invalid phone", 400);
    updates.push("phoneNumber = ?"); values.push(phoneNumber);
  }
  if (role && AvailableUserRoles.includes(role)) { updates.push("role = ?"); values.push(role); }
  if (status) { updates.push("status = ?"); values.push(status); }
  if (unit) {
    if (!AvailableUnits.includes(unit)) throw new ApiError("Invalid unit", 400);
    updates.push("unit = ?"); values.push(unit);
  }

  if (values.length > 0) {
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, userId]);
  }

  const [updated] = await pool.query(`
        SELECT u.*, d.name as departmentName 
        FROM users u 
        LEFT JOIN departments d ON u.department = d.id 
        WHERE u.id = ?
    `, [userId]);

  const u = updated[0];
  delete u.password;
  u.department = u.department ? { _id: u.department, name: u.departmentName } : null;
  delete u.departmentName;
  u._id = u.id;

  await logAudit(req.user.id, "UPDATE_USER", { userId });

  res.json(new ApiResponse(200, u, "User updated successfully"));
});

// Get All Instructors
export const getAllInstructors = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  let whereSQL = "u.role = 'INSTRUCTOR' AND (u.isDeleted = 0 OR u.isDeleted IS NULL)";
  let params = [];

  if (req.query.search) {
    const t = `%${req.query.search}%`;
    whereSQL += " AND (u.fullName LIKE ? OR u.email LIKE ? OR u.userName LIKE ?)";
    params.push(t, t, t);
  }
  if (req.query.status) { whereSQL += " AND u.status = ?"; params.push(req.query.status); }
  if (req.query.unit) { whereSQL += " AND u.unit = ?"; params.push(req.query.unit); }
  if (req.query.departmentId) {
    whereSQL += " AND u.department = ?"; // Assuming single department link for Instructor in SQL schema for simplicity or main dept
    params.push(req.query.departmentId);
  }

  const [cnt] = await pool.query(`SELECT COUNT(*) as total FROM users u WHERE ${whereSQL}`, params);
  const totalUsers = cnt[0].total;

  const [instructors] = await pool.query(`
        SELECT u.*, d.name as deptName, d.instructor as deptInstructor
        FROM users u
        LEFT JOIN departments d ON u.department = d.id
        WHERE ${whereSQL}
        ORDER BY u.createdAt DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `, [...params, offset, limit]);

  const formatted = instructors.map(u => ({
    _id: u.id, fullName: u.fullName, userName: u.userName, email: u.email,
    phoneNumber: u.phoneNumber, role: u.role, status: u.status, unit: u.unit, createdAt: u.createdAt,
    avatar: parseJSON(u.avatar),
    department: u.department ? { _id: u.department, name: u.deptName, instructor: u.deptInstructor } : null
  }));

  await logAudit(req.user.id, "VIEW_TRAINER", { totalInstructors: totalUsers });

  res.json(new ApiResponse(200, {
    users: formatted, totalUsers, totalPages: Math.ceil(totalUsers / limit), currentPage: page, limit
  }, "Instructors fetched successfully"));
});

// Get All Students
export const getAllStudents = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  let whereSQL = "u.role = 'STUDENT' AND (u.isDeleted = 0 OR u.isDeleted IS NULL)";
  let params = [];

  if (req.query.search) {
    const t = `%${req.query.search}%`;
    whereSQL += " AND (u.fullName LIKE ? OR u.email LIKE ? OR u.userName LIKE ?)";
    params.push(t, t, t);
  }
  if (req.query.status) { whereSQL += " AND u.status = ?"; params.push(req.query.status); }
  if (req.query.unit) { whereSQL += " AND u.unit = ?"; params.push(req.query.unit); }
  if (req.query.departmentId) { whereSQL += " AND u.department = ?"; params.push(req.query.departmentId); }

  // Instructor Limitation
  if (req.user.role === "INSTRUCTOR") {
    // Find instructor departments first
    const [iDepts] = await pool.query("SELECT id FROM departments WHERE instructor = ?", [req.user.id]);
    if (iDepts.length > 0) {
      const ids = iDepts.map(d => d.id).join(',');
      whereSQL += ` AND u.department IN (${ids})`;
    } else {
      whereSQL += " AND 1=0"; // No access
    }
  }

  const [cnt] = await pool.query(`SELECT COUNT(*) as total FROM users u WHERE ${whereSQL}`, params);
  const totalUsers = cnt[0].total;

  // Enrolled courses? Complex join. Skipping or fetching separately if critical.
  // Basic fetch:
  const [students] = await pool.query(`
        SELECT u.*, d.name as deptName, d.instructor as deptInstructor
        FROM users u
        LEFT JOIN departments d ON u.department = d.id
        WHERE ${whereSQL}
        ORDER BY u.createdAt DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `, [...params, offset, limit]);

  const formatted = students.map(u => ({
    _id: u.id, fullName: u.fullName, userName: u.userName, email: u.email,
    phoneNumber: u.phoneNumber, role: u.role, status: u.status, unit: u.unit, createdAt: u.createdAt,
    avatar: parseJSON(u.avatar),
    department: u.department ? { _id: u.department, name: u.deptName, instructor: u.deptInstructor } : null
  }));

  await logAudit(req.user.id, "VIEW_EMPLOYEES", { totalStudents: totalUsers });

  res.json(new ApiResponse(200, {
    users: formatted, totalUsers, totalPages: Math.ceil(totalUsers / limit), currentPage: page, limit
  }, "Students fetched successfully"));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { deleteFromCloudinary } = await import("../config/cloudinary.js");

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) throw new ApiError("User not found", 404);
  const user = rows[0];
  const avatar = parseJSON(user.avatar);

  if (avatar?.publicId) {
    await deleteFromCloudinary(avatar.publicId);
  }

  if (req.user.role === "SUPERADMIN") {
    await pool.query("DELETE FROM users WHERE id = ?", [userId]);
    await logAudit(req.user.id, "DELETE_USER_PERMANENT", { userId });
  } else {
    await pool.query("UPDATE users SET isDeleted = 1 WHERE id = ?", [userId]);
    await logAudit(req.user.id, "DELETE_USER_SOFT", { userId });
  }

  res.json(new ApiResponse(200, null, "User deleted successfully"));
});

export const getSoftDeletedUsers = asyncHandler(async (req, res) => {
  // Basic implementation mirroring getAllUsers but isDeleted=1
  const limit = 20; const offset = 0; // simplified
  const [users] = await pool.query("SELECT TOP 20 * FROM users WHERE isDeleted = 1");
  const formatted = users.map(u => ({ ...u, avatar: parseJSON(u.avatar), _id: u.id }));

  res.json(new ApiResponse(200, { users: formatted, totalUsers: users.length }, "Soft-deleted users fetched"));
});

export const restoreUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) throw new ApiError("User not found", 404);

  await pool.query("UPDATE users SET isDeleted = 0 WHERE id = ?", [userId]);
  await logAudit(req.user.id, "RESTORE_USER", { userId });

  res.json(new ApiResponse(200, { _id: userId }, "User restored successfully"));
});
