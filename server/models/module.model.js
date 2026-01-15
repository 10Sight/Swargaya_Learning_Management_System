import { pool } from "../db/connectDB.js";
import { slugify } from "../utils/slugify.js";
import logger from "../logger/winston.logger.js";

class Module {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.course = data.course;
    this.title = data.title;
    this.description = data.description;
    this.slug = data.slug;
    this.order = data.order !== undefined ? data.order : 1;
    this.lessons = typeof data.lessons === 'string' ? JSON.parse(data.lessons) : (data.lessons || []);
    this.resources = typeof data.resources === 'string' ? JSON.parse(data.resources) : (data.resources || []);

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async init() {
    const query = `
            CREATE TABLE IF NOT EXISTS modules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                slug VARCHAR(255),
                \`order\` INT DEFAULT 1,
                lessons TEXT,
                resources TEXT,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_course_slug (course, slug),
                INDEX idx_course (course)
            )
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize Module table", error);
    }
  }

  static async create(data) {
    // Generate unique slug scoped to course
    let baseSlug = slugify(data.title);
    let slug = baseSlug;
    let suffix = 1;
    while (true) {
      const [rows] = await pool.query(
        "SELECT id FROM modules WHERE slug = ? AND course = ?",
        [slug, data.course]
      );
      if (rows.length === 0) break;
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    data.slug = slug;

    const moduleItem = new Module(data);

    const fields = [
      "course", "title", "description", "slug",
      "order", "lessons", "resources", "createdAt"
    ];

    if (!moduleItem.createdAt) moduleItem.createdAt = new Date();

    const values = fields.map(field => {
      let val = moduleItem[field];
      if (['lessons', 'resources'].includes(field)) {
        return JSON.stringify(val);
      }
      if (val === undefined) return null;
      return val;
    });

    // specific handling for "order" keyword
    const escapedFields = fields.map(f => f === 'order' ? '`order`' : f);
    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO modules (${escapedFields.join(",")}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);
    return Module.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM modules WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Module(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => {
      if (key === 'order') return "`order` = ?";
      return `${key} = ?`;
    }).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT * FROM modules WHERE ${whereClause} LIMIT 1`, values);
    if (rows.length === 0) return null;
    return new Module(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined && key !== 'sort');
    let sql = "SELECT * FROM modules";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => {
        if (key === 'order') return "`order` = ?";
        return `${key} = ?`;
      }).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    if (query.sort) {
      const sortKey = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortKey] === -1 ? 'DESC' : 'ASC';
      const escapedSortKey = sortKey === 'order' ? '`order`' : sortKey;
      sql += ` ORDER BY ${escapedSortKey} ${sortOrder}`;
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new Module(row));
  }

  static async countDocuments(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT COUNT(*) as count FROM modules";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => {
        if (key === 'order') return "`order` = ?";
        return `${key} = ?`;
      }).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    return rows[0].count;
  }

  async save() {
    // Slug update logic skipped for simplicity, similar to Lesson model

    const fields = [
      "course", "title", "description", "slug",
      "order", "lessons", "resources"
    ];

    const setClause = fields.map(field => {
      const col = field === 'order' ? '`order`' : field;
      return `${col} = ?`;
    }).join(", ");

    const values = fields.map(field => {
      let val = this[field];
      if (['lessons', 'resources'].includes(field)) {
        return JSON.stringify(val);
      }
      return val;
    });
    values.push(this.id);

    await pool.query(`UPDATE modules SET ${setClause} WHERE id = ?`, values);
    return this;
  }
}

// Initialize table
Module.init();

export default Module;
