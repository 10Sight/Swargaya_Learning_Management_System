import { pool } from '../db/connectDB.js';

async function run() {
  console.log("Checking and altering departments table...");
  const alterQuery = `
    IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'dbo.departments') 
        AND name = 'instructor'
    )
    BEGIN
        ALTER TABLE dbo.departments ADD instructor INT;
        PRINT 'Added instructor column to departments table';
    END
    ELSE
    BEGIN
        PRINT 'instructor column already exists in departments table';
    END
  `;
  await pool.query(alterQuery);
  console.log("Migration check completed!");
}

(async () => {
  try {
    await run();
    process.exit(0);
  } catch (err) {
    console.error('Error running schema fix:', err);
    process.exit(1);
  }
})();
