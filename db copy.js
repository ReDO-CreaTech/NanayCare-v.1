
// ==========================
// ATTACH TO GLOBAL SCOPE
// ==========================

window.createPatient = async function(data, generateId = true) {
  return {
    _id: generateId ? "p_" + Date.now() : data._id,
    type: "patient",
    createdAt: new Date().toISOString(),
    ...data
  };
};

window.savePatient = async function(record) {
  try {
    // PouchDB requires the _rev (revision) to update existing records
    const existing = await db.get(record._id).catch(() => null);
    if (existing) {
      record._rev = existing._rev; 
    }
    await db.put(record);
    console.log("✅ Patient saved to IndexedDB");
    return record;
  } catch (err) {
    console.error("Save error:", err);
    throw err;
  }
};

window.getAllPatients = async function() {
  try {
    const res = await db.allDocs({ include_docs: true });
    return res.rows.map(r => r.doc);
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
};

window.getPatient = async function(id) {
  try {
    return await db.get(id);
  } catch {
    return null;
  }
};

window.deletePatient = async function(id) {
  try {
    const doc = await db.get(id);
    await db.remove(doc);
    console.log("🗑️ Record deleted");
  } catch (err) {
    console.error("Delete error:", err);
  }
};





// ==========================
// 1. SAFE POUCHDB INIT
// ==========================

let db;

if (typeof PouchDB === "undefined") {
  console.error("❌ PouchDB script missing from HTML!");
  db = null;
} else {
  db = new PouchDB("nanaycare_patients");
  console.log("✅ PouchDB initialized");
}

// ==========================
// 2. DATA FUNCTIONS (Exposed to Global Scope)
// ==========================

// This function bridges your UI and the Database
window.createPatient = async function(data) {
  return {
    ...data,
    _id: "patient_" + new Date().toISOString(), // Unique ID
    updatedAt: new Date().toISOString()
  };
};

window.savePatient = async function(record) {
  if (!db) return console.error("DB not available");
  try {
    const res = await db.put(record);
    console.log("✅ Saved:", res);
    return res;
  } catch (err) {
    console.error("❌ Save Error:", err);
  }
};

window.getAllPatients = async function() {
  if (!db) return [];
  try {
    const result = await db.allDocs({ include_docs: true, descending: true });
    return result.rows.map(row => row.doc);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    return [];
  }
};

window.getPatient = async function(id) {
  if (!db) return null;
  try {
    return await db.get(id);
  } catch (err) {
    return null;
  }
};

window.deletePatient = async function(id) {
  if (!db) return;
  try {
    const doc = await db.get(id);
    return await db.remove(doc);
  } catch (err) {
    console.error("❌ Delete Error:", err);
  }
};

// ==========================
// 3. SYNC LOGIC
// ==========================
function startSync() {
  if (!db || !navigator.onLine) return;
  
  // 1. ADD THE DB NAME TO THE END OF THE URL
  const remoteURL = "https://your-server.com";
  const remoteDB = new PouchDB(remoteURL);

  console.log("🔄 Attempting to sync with:", remoteURL);

  db.sync(remoteDB, { 
    live: true, 
    retry: true 
  })
  .on('change', info => console.log("✨ Sync Change:", info))
  .on('paused', err => console.log("⏸️ Sync Paused", err || ""))
  .on('active', () => console.log("🏃 Sync Resumed"))
  .on('error', err => {
    console.error("❌ CRITICAL SYNC ERROR:", err);
    // Check if err.status === 401 (Auth) or 403 (CORS)
  });
}


