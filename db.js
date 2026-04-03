const db = new Dexie("IMCI_DB");

db.version(1).stores({
  patients: "id, createdAt, updatedAt, source"
});

window.db = db;