import { getConfiguredDbPath } from "./config";
import { openDb, initSchema, setupFts5 } from "./db";

const db = openDb(getConfiguredDbPath());
initSchema(db);
setupFts5(db);
console.log("Schema initialised.");
