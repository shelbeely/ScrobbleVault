import { getConfiguredDbPath } from "./config";
import { openDb, initSchema, setupFts5 } from "./db";
import { ensureDefaultUser } from "./auth";

const db = openDb(getConfiguredDbPath());
initSchema(db);
setupFts5(db);
const seeded = await ensureDefaultUser(db);
console.log(`Default user ready: ${seeded.username}${seeded.created ? " (created)" : ""}`);
