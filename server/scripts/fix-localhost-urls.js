import { pool } from '../db/connectDB.js';

// Legacy resource records stored absolute "http://localhost:<port>/uploads/..."
// URLs. Those only resolve on the machine running the backend, so LAN/remote
// clients get a connection-refused error. Rewriting them to relative
// "/uploads/..." paths makes them resolve against whatever host served the page.
const LOCALHOST_UPLOAD_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/uploads\/.*)$/i;

async function fixLocalhostUrls() {
  const [rows] = await pool.query(
    "SELECT id, url FROM resources WHERE url LIKE 'http://localhost%/uploads/%' OR url LIKE 'http://127.0.0.1%/uploads/%'"
  );

  let updated = 0;
  for (const row of rows) {
    const match = row.url.match(LOCALHOST_UPLOAD_URL);
    if (!match) continue;
    const relativeUrl = match[3];
    await pool.query("UPDATE resources SET url = ? WHERE id = ?", [relativeUrl, row.id]);
    updated++;
  }

  return { scanned: rows.length, updated };
}

(async () => {
  try {
    const res = await fixLocalhostUrls();
    console.log("Localhost URL fix complete:", res);
    process.exit(0);
  } catch (e) {
    console.error("Localhost URL fix failed:", e);
    process.exit(1);
  }
})();
