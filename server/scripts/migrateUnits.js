import { pool } from '../db/connectDB.js';

const LEGACY_MAP = {
    'UNIT_1': 'UNIT 1',
    'UNIT_2': 'UNIT 2',
    'UNIT_3': 'UNIT 3',
    'UNIT_4': 'UNIT 4',
    'UNIT_5': 'UNIT 5',
};

async function migrateUnits() {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [existingUnits] = await conn.query('SELECT id, title FROM units');
        const byTitle = {};
        for (const u of existingUnits) byTitle[u.title] = u.id;

        for (const [legacy, dynamic] of Object.entries(LEGACY_MAP)) {
            const legacyId = byTitle[legacy];
            const dynamicId = byTitle[dynamic];

            if (!legacyId) {
                console.log(`  [SKIP] '${legacy}' not found in units table`);
                continue;
            }

            if (dynamicId) {
                // Dynamic version already exists: migrate users then remove legacy record
                console.log(`  [MERGE] '${legacy}' -> '${dynamic}' (dynamic already exists)`);
                await conn.query(
                    `UPDATE users SET unit = ? WHERE unit = ?`,
                    [dynamic, legacy]
                );
                await conn.query(`DELETE FROM units WHERE id = ?`, [legacyId]);
            } else {
                // Rename legacy record in-place
                console.log(`  [RENAME] '${legacy}' -> '${dynamic}'`);
                await conn.query(
                    `UPDATE units SET title = ?, updatedAt = GETDATE() WHERE id = ?`,
                    [dynamic, legacyId]
                );
                await conn.query(
                    `UPDATE users SET unit = ? WHERE unit = ?`,
                    [dynamic, legacy]
                );
            }
        }

        // Catch-all: replace any remaining UNIT_X patterns not covered above
        for (const [legacy, dynamic] of Object.entries(LEGACY_MAP)) {
            await conn.query(
                `UPDATE users SET unit = ? WHERE unit = ?`,
                [dynamic, legacy]
            );
        }

        await conn.commit();
        console.log('\nMigration completed successfully.');
    } catch (err) {
        await conn.rollback();
        console.error('\nMigration failed — rolled back:', err.message);
        throw err;
    } finally {
        conn.release();
    }
}

(async () => {
    try {
        console.log('Starting unit migration...\n');
        await migrateUnits();
        await pool.end();
        process.exit(0);
    } catch {
        await pool.end();
        process.exit(1);
    }
})();
