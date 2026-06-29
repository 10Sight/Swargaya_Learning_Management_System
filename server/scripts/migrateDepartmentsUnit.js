import { pool } from '../db/connectDB.js';
import { slugify, ensureUniqueSlug } from '../utils/slugify.js';

// Matches patterns like: (unit-3), (unit 3), unit-3, unit3, (UNIT–3), etc.
const UNIT_PATTERN = /\s*[\(\[]?\s*unit\s*[-–—]?\s*(\d+)\s*[\)\]]?\s*/gi;

function parseUnit(name) {
    const match = UNIT_PATTERN.exec(name);
    UNIT_PATTERN.lastIndex = 0; // reset stateful regex
    if (!match) return null;
    return `UNIT ${match[1]}`;
}

function cleanName(name) {
    return name
        .replace(/\s*[\(\[]?\s*unit\s*[-–—]?\s*\d+\s*[\)\]]?\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function migrate() {
    const [rows] = await pool.query('SELECT id, name, slug FROM departments WHERE unit IS NULL');

    if (rows.length === 0) {
        console.log('No departments with NULL unit found. Nothing to migrate.');
        return;
    }

    console.log(`Found ${rows.length} department(s) to process.`);

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
        const unit = parseUnit(row.name);
        const cleanedName = unit ? cleanName(row.name) : row.name;
        const newSlug = await ensureUniqueSlug('departments', slugify(cleanedName), {}, row.id);

        if (unit || cleanedName !== row.name || newSlug !== row.slug) {
            await pool.query(
                'UPDATE departments SET unit = ?, name = ?, slug = ? WHERE id = ?',
                [unit, cleanedName, newSlug, row.id]
            );
            console.log(`  [${row.id}] "${row.name}" → name="${cleanedName}", unit=${unit ?? 'NULL'}, slug="${newSlug}"`);
            updated++;
        } else {
            console.log(`  [${row.id}] "${row.name}" — no unit found, left as global (unit=NULL)`);
            skipped++;
        }
    }

    console.log(`\nMigration complete: ${updated} updated, ${skipped} left as global.`);
}

(async () => {
    try {
        await migrate();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
