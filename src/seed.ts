import { openDb, initSchema, setupFts5 } from "./db";
import { ensureDefaultUser } from "./auth";

const db = openDb(Bun.env.SCROBBLEDB_PATH || undefined);
initSchema(db);
setupFts5(db);
const seeded = await ensureDefaultUser(db);
console.log(`Default user ready: ${seeded.username}${seeded.created ? " (created)" : ""}`);
