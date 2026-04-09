
// ==========================
// DECRYPT LAYER
// ==========================
async function safeParse(doc) {
  // 🔥 If encrypted
  if (doc.data) {
    try {
      return JSON.parse(atob(doc.data));
    } catch {
      console.warn("Decrypt failed, fallback raw");
      return doc;
    }
  }

  // 🔥 If normal record
  return doc;
}

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
  if (!db) throw new Error("DB not initialized");

  try {
    const existing = await db.get(record._id).catch(() => null);

    if (existing) {
      const existingHistory = existing.history || [];
      const newHistory = record.history || [];

      const merged = [...existingHistory];

      newHistory.forEach(n => {
        if (!merged.find(m => m.date === n.date)) {
          merged.push(n);
        }
      });

      record = {
        ...existing,
        ...record,
        history: merged
      };
    }

    return await db.put(record);
  } catch (err) {
    console.error("❌ Save FAILED", err);
    throw err;
  }
};

window.getAllPatients = async function() {
  if (!db) return [];
  try {
    const result = await db.allDocs({ include_docs: true, descending: true });
    // return result.rows.map(row => row.doc);
    const parsed = await Promise.all(
  result.rows.map(async row => await safeParse(row.doc))
);

return parsed;
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    return [];
  }
};

window.getPatient = async function(id) {
  if (!db) return null;
  try {
    // return await db.get(id);
    const doc = await db.get(id);
return await safeParse(doc);
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


// window.savePatient = async function(record) {
//   console.log("[DB] savePatient called", record);

//   if (!db) throw new Error("[DB] Not initialized");

//   try {
//     const res = await db.put(record);
//     console.log("[DB] Saved OK", res);
//     return res;
//   } catch (err) {
//     console.error("[DB] Save FAILED", err);
//     throw err;
//   }
// };
window.savePatient = async function(record) {
  if (!db) throw new Error("DB not initialized");

  try {
    const encrypted = btoa(JSON.stringify(record));

    const doc = {
      _id: record._id,
      data: encrypted
    };

    return await db.put(doc);
  } catch (err) {
    console.error("❌ Save FAILED", err);
    throw err;
  }
};




// ==========================
// 3. SYNC LOGIC
// ==========================
function startSync() {
  if (!db || !navigator.onLine) return;
  
  // 1. ADD THE DB NAME TO THE END OF THE URL
  const remoteURL = "https://nanaycare1-zw1f2pm0.b4a.run/nanaycare_db";
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

function loginScreen() {
  render(card(`
    <h2>Medical Login</h2>
    <input id="username" placeholder="Your Name">
    <select id="role">
      <option value="healthworker">Health Worker</option>
      <option value="doctor">Doctor</option>
    </select>
    <button data-action="login">Login</button>
  `));
}

window.addEventListener("load", () => {
  startSync();
});


