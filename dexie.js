// ===============================
// 📦 LOAD DEXIE (SAFE)
// ===============================
(function loadDexie() {
  if (window.Dexie) return;

  const script = document.createElement("script");
  script.src = "https://unpkg.com/dexie@3/dist/dexie.min.js";
  document.head.appendChild(script);
})();

// ===============================
// ⏳ WAIT FOR DEXIE
// ===============================
function waitForDexie() {
  return new Promise(resolve => {
    const check = () => {
      if (window.Dexie) return resolve();
      setTimeout(check, 50);
    };
    check();
  });
}

// ===============================
// 🧱 INIT DB (SINGLETON)
// ===============================
let dbPromise = (async () => {
  await waitForDexie();

  const db = new Dexie("IMCI_DB");

  db.version(1).stores({
    patients: "id, createdAt, updatedAt, source"
  });

  console.log("✅ DB Ready");
  return db;
})();

// helper
async function getDB() {
  return dbPromise;
}

// ===============================
// 🧾 PATIENT SCHEMA
// ===============================
window.createPatient = function (data = {}, preserveId = false) {
  return {
    id: preserveId && data.id
      ? String(data.id)
      : `p_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,

    name: data.name || "",
    ageDays: data.ageDays || null,
    weight: data.weight || null,
    height: data.height || null,

    symptoms: data.symptoms || {},

    classifications: data.classifications || [],
    treatments: data.treatments || [],

    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),

    location: data.location || null,
    source: data.source || "app",

    version: 1
  };
};

// ===============================
// 💾 CRUD (SINGLE SOURCE OF TRUTH)
// ===============================
window.savePatient = async function (patient) {
  const db = await getDB();

  patient.updatedAt = Date.now();
  await db.patients.put(patient);

  // optional sync hook
  if (window.queueSync) {
    queueSync({ type: "UPSERT", data: patient });
  }

  return patient;
};

window.getAllPatients = async function () {
  const db = await getDB();
  return db.patients.orderBy("createdAt").reverse().toArray();
};

window.getPatientById = async function (id) {
  const db = await getDB();
  return db.patients.get(id);
};

window.deletePatient = async function (id) {
  const db = await getDB();
  return db.patients.delete(id);
};