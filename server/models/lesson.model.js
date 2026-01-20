import { pool } from "../db/connectDB.js";
import { slugify } from "../utils/slugify.js";
import logger from "../logger/winston.logger.js";

class Lesson {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.module = data.module;
    this.title = data.title;
    this.content = data.content;
    this.slides = typeof data.slides === 'string' ? JSON.parse(data.slides) : (data.slides || []);
    this.duration = data.duration !== undefined ? data.duration : 0;
    this.order = data.order !== undefined ? data.order : 1;
    this.slug = data.slug;
    this.resources = typeof data.resources === 'string' ? JSON.parse(data.resources) : (data.resources || []);

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async init() {
    const query = `
            IF OBJECT_ID(N'dbo.lessons', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.lessons (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    module VARCHAR(255) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content VARCHAR(MAX),
                    slides VARCHAR(MAX),
                    duration INT DEFAULT 0,
                    [order] INT DEFAULT 1,
                    slug VARCHAR(255),
                    resources VARCHAR(MAX),
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_lesson_module_slug UNIQUE (module, slug)
                );
            END
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize Lesson table", error);
    }
  }

  static async create(data) {
    // Generate unique slug scoped to module
    let baseSlug = slugify(data.title);
    let slug = baseSlug;
    let suffix = 1;
    while (true) {
      const [rows] = await pool.query(
        "SELECT id FROM lessons WHERE slug = ? AND module = ?",
        [slug, data.module]
      );
      if (rows.length === 0) break;
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    data.slug = slug;

    const lesson = new Lesson(data);

    const fields = [
      "module", "title", "content", "slides",
      "duration", "order", "slug", "resources", "createdAt"
    ];

    if (!lesson.createdAt) lesson.createdAt = new Date();

    const values = fields.map(field => {
      let val = lesson[field];
      if (['slides', 'resources'].includes(field)) {
        return JSON.stringify(val);
      }
      if (val === undefined) return null;
      return val;
    });

    const escapedFields = fields.map(f => f === 'order' ? '[order]' : f);
    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO lessons (${escapedFields.join(",")}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS id;`;

    const [rows] = await pool.query(query, values);
    return Lesson.findById(rows[0].id);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM lessons WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Lesson(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => {
      if (key === 'order') return "[order] = ?";
      return `${key} = ?`;
    }).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT TOP 1 * FROM lessons WHERE ${whereClause}`, values);
    if (rows.length === 0) return null;
    return new Lesson(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined && key !== 'sort');
    let sql = "SELECT * FROM lessons";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => {
        if (key === 'order') return "[order] = ?";
        return `${key} = ?`;
      }).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    if (query.sort) {
      const sortKey = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortKey] === -1 ? 'DESC' : 'ASC';
      const escapedSortKey = sortKey === 'order' ? '[order]' : sortKey;
      sql += ` ORDER BY ${escapedSortKey} ${sortOrder}`;
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new Lesson(row));
  }

  static async countDocuments(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT COUNT(*) as count FROM lessons";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => {
        if (key === 'order') return "[order] = ?";
        return `${key} = ?`;
      }).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    return rows[0].count;
  }

  async save() {
    this.updatedAt = new Date(); // Manually update timestamp

    const fields = [
      "module", "title", "content", "slides",
      "duration", "order", "slug", "resources", "updatedAt"
    ];

    const setClause = fields.map(field => {
      const col = field === 'order' ? '[order]' : field;
      return `${col} = ?`;
    }).join(", ");

    const values = fields.map(field => {
      let val = this[field];
      if (['slides', 'resources'].includes(field)) {
        return JSON.stringify(val);
      }
      return val;
    });
    values.push(this.id);

    await pool.query(`UPDATE lessons SET ${setClause} WHERE id = ?`, values);
    return this;
  }
}

// Initialize table
Lesson.init();

export default Lesson;
