import { openDb, initSchema, setupFts5 } from "./db";

const db = openDb(Bun.env.SCROBBLEDB_PATH || undefined);
initSchema(db);
setupFts5(db);
console.log("Schema initialised.");
