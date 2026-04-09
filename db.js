


window.addEventListener("load", () => {
  console.log("[SYSTEM CHECK]", systemCheck());

  if (!db) {
    alert("Database failed to initialize");
  }
});
// ==========================
// 1. SAFE POUCHDB INIT
// ==========================

window.db = null;

if (typeof PouchDB === "undefined") {
  console.error("❌ PouchDB script missing from HTML!");
  // db = null;
} else {
  window.db = new PouchDB("nanaycare_patients");
  console.log("✅ DB initialized:", window.db);
}

// ==========================
// 2. DATA FUNCTIONS (Exposed to Global Scope)
// ==========================

// This function bridges your UI and the Database
// window.createPatient = async function(data) {
//   return {
//     ...data,
//     _id: "patient_" + new Date().toISOString(), // Unique ID
//     updatedAt: new Date().toISOString()
//   };
// };

window.createPatient = async function(data) {
  const now = new Date().toISOString();

  return {
    ...data,
    _id: "patient_" + now,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        date: now,
        snapshot: data
      }
    ]
  };
};

window.savePatient = async function(record) {
  // if (!db) return console.error("DB not available");
  if (!db) throw new Error("DB not initialized");
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
// DEBUGGER
// ==========================


window.savePatient = async function(record) {
  console.log("[DB] savePatient called", record);

  if (!db) throw new Error("[DB] Not initialized");

  try {
    const res = await db.put(record);
    console.log("[DB] Saved OK", res);
    return res;
  } catch (err) {
    console.error("[DB] Save FAILED", err);
    throw err;
  }
};




// ==========================
// 3. SYNC LOGIC
// ==========================
function startSync() {
  if (!db || !navigator.onLine) return;
  
  // 1. ADD THE DB NAME TO THE END OF THE URL
  const remoteURL = "https://nanaycare1-uyrgvh9g.b4a.run/nanaycare_db";
  const remoteDB = new PouchDB(remoteURL, {
  auth: {
    username: "admin",
    password: "your_secure_password"
  }
});

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



window.addEventListener("load", () => {
  startSync();
});


