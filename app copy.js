// ==========================
// GLOBAL SAFETY
// ==========================
document.addEventListener("contextmenu", (e) => e.preventDefault());

if (typeof window.__ === "undefined") {
  window.__ = function (key) { return key; };
}

// ==========================
// PATIENT STORE (SCALABLE)
// ==========================
const PatientStore = (() => {
  const STORAGE_KEY = "patients_v2";
  let cache = null;
  const listeners = new Set();

  function load() {
    if (cache) return cache;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      cache = raw ? JSON.parse(raw) : [];
    } catch {
      cache = [];
    }

    return cache;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    listeners.forEach(fn => fn(cache));
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    async getAll() {
      return [...load()];
    },

    async getById(id) {
      return load().find(p => p.id === id) || null;
    },

    async save(p) {
      const list = load();
      const index = list.findIndex(x => x.id === p.id);

      if (index >= 0) {
        list[index] = { ...list[index], ...p };
      } else {
        list.push({ ...p });
      }

      persist();
      return p;
    },

    async delete(id) {
      cache = load().filter(p => p.id !== id);
      persist();
    }
  };
})();

// wrappers
async function getAllPatients() { return PatientStore.getAll(); }
async function getPatientById(id) { return PatientStore.getById(id); }
async function savePatient(p) { return PatientStore.save(p); }
async function deletePatient(id) { return PatientStore.delete(id); }

// ==========================
// GLOBAL STATE
// ==========================
let patient = { id: `p_${Date.now()}` };
let step = 0;
let flow = [];
let lang = "en";

const screen = document.getElementById("screen");

// ==========================
// STORE SUBSCRIBE (AUTO UI)
// ==========================
PatientStore.subscribe(() => {
  if (screen.innerHTML.includes("Patient Records")) {
    showPatientList();
  }
});

// ==========================
// START
// ==========================
function start() {
  step = 0;
  patient = { id: `p_${Date.now()}` };
  intake();
}

// ==========================
// RENDER PATIENT
// ==========================
function renderPatient(p) {
  patient = { ...p };
  window.currentPatient = { ...p };

  screen.innerHTML = `
    <div class="card">
      <h2>${p.name}</h2>
      <p>Weight: ${p.weight}</p>
      <p>Height: ${p.height || "-"}</p>
      <p>Treatment: ${p.treatments?.join(", ") || "-"}</p>

      <button onclick="editPatient('${p.id}')">✏️ Edit</button>
      <button onclick="showPatientList()">📋 Back</button>
    </div>
  `;
}

// ==========================
// LIST
// ==========================
window.showPatientList = async function () {
  const patients = await getAllPatients();

  if (!patients.length) {
    screen.innerHTML = `
      <div class="card">
        <h2>No Records</h2>
        <button onclick="start()">New</button>
      </div>`;
    return;
  }

  screen.innerHTML = `
    <div class="card">
      <h2>Patient Records</h2>
      ${patients.map(p => `
        <div onclick="viewPatient('${p.id}')">
          <strong>${p.name || "Unnamed"}</strong>
        </div>`).join("")}
      <button onclick="start()">New</button>
    </div>`;
};

// ==========================
// VIEW
// ==========================
window.viewPatient = async function (id, data = null) {
  let p = data || await getPatientById(id);

  if (!p) return alert("Patient not found");

  patient = { ...p };
  window.currentPatient = { ...p };

  renderPatient(p);
};

// ==========================
// EDIT
// ==========================
window.editPatient = async function (id) {
  const p = await getPatientById(id);
  if (!p) return;

  patient = { ...p };

  screen.innerHTML = `
    <div class="card">
      <input id="editName" value="${p.name || ""}">
      <input id="editWeight" value="${p.weight || ""}">

      <button onclick="saveEdit('${id}')">Save</button>
    </div>`;
};

window.saveEdit = async function (id) {
  patient.name = document.getElementById("editName").value;
  patient.weight = Number(document.getElementById("editWeight").value);

  await savePatient(patient);

  window.currentPatient = { ...patient };

  renderPatient(patient);
};

// ==========================
// DELETE
// ==========================
window.confirmDelete = async function (id) {
  if (!confirm("Delete?")) return;
  await deletePatient(id);
  showPatientList();
};

// ==========================
// INTAKE
// ==========================
function intake() {
  screen.innerHTML = `
    <div class="card">
      <input id="firstname" placeholder="Name">
      <input id="fullname" placeholder="Name">
      <input id="age" type="number" placeholder="Age">
      <input id="weight" type="number" placeholder="Weight">

      <button onclick="saveIntake()">Next</button>
      <button onclick="showPatientList()">Records</button>
    </div>`;
}

function saveIntake() {
  patient.name = document.getElementById("name").value;
  patient.ageDays = Number(document.getElementById("age").value);
  patient.weight = Number(document.getElementById("weight").value);

  // next();
  initFlow();
}

// ==========================





// ==========================
// FLOW ENGINE (CLEAN)
// ==========================

// INIT FLOW AFTER INTAKE
function initFlow() {
  step = 0;

  flow = patient.ageDays < 60
    ? infantFlow
    : childFlow;

  next();
}

// ==========================
// NEXT STEP
// ==========================
function next() {
  console.log("STEP:", step, "FLOW:", flow[step]);
  // skip conditional questions
  while (step < flow.length) {
    const q = flow[step];

    if (q.when && !q.when(patient)) {
      step++;
      continue;
    }
    break;
  }

  // end → result
  if (step >= flow.length) {
    return result();
  }

  const q = flow[step];

  // BOOLEAN
  if (q.type === "boolean") {
    screen.innerHTML = `
      <div class="card">
        <h2>${q.label?.[lang] || q.label}</h2>
        <button onclick="ans(true)">Yes</button>
        <button onclick="ans(false)">No</button>
      </div>`;
  }

  // NUMBER
  else if (q.type === "number") {
    screen.innerHTML = `
      <div class="card">
        <h2>${q.label?.[lang] || q.label}</h2>
        <input id="val" type="number">
        <button onclick="ansNum()">Next</button>
      </div>`;
  }

  // SELECT
  else if (q.type === "select") {
    screen.innerHTML = `
      <div class="card">
        <h2>${q.label?.[lang] || q.label}</h2>
        <select id="val">
          ${q.options.map(o => `
            <option value="${o.value}">
              ${o.label?.[lang] || o.label}
            </option>
          `).join("")}
        </select>
        <button onclick="ansSel()">Next</button>
      </div>`;
  }
}

// ==========================
// ANSWERS
// ==========================
function ans(value) {
  const q = flow[step];
  if (!q) return;

  patient[q.id] = value;

  // 🚨 EARLY EXIT (INFANT DANGER)
  if (patient.ageDays < 60) {
    if (
      patient.unableToDrink ||
      patient.convulsions ||
      patient.lethargic ||
      (patient.temperature >= 37.5) ||
      (patient.temperature < 35.5) ||
      (patient.respiratoryRate >= 60) ||
      patient.severeChestIndrawing
    ) {
      step = flow.length;
      return next();
    }
  }

  step++;
  next();
}

function ansNum() {
  const val = document.getElementById("val").value;
  if (val === "") return alert("Enter value");

  const q = flow[step];
  patient[q.id] = Number(val);

  if (q.id === "temperature") {
    patient.fever = patient.temperature >= 37.5;
    patient.lowTemp = patient.temperature < 35.5;
  }

  step++;
  next();
}

function ansSel() {
  const q = flow[step];
  patient[q.id] = document.getElementById("val").value;

  step++;
  next();
}

// ==========================
// BREATHING CLASSIFIER (WHO)
// ==========================
function classifyBreathingWHO(ageDays, rate) {
  if (!rate) return null;

  if (ageDays < 60 && rate >= 60) return "SEVERE_PNEUMONIA";
  if (ageDays < 365 && rate >= 50) return "SEVERE_PNEUMONIA";
  if (ageDays >= 365 && rate >= 40) return "SEVERE_PNEUMONIA";

  return "NORMAL";
}

// ==========================
// RESULT (CONNECTED TO STORE)
// ==========================
async function result() {

  const breathClass = classifyBreathingWHO(
    patient.ageDays,
    patient.respiratoryRate
  );

  let results = patient.ageDays < 60
    ? classifyInfant(patient)
    : classifyChild(patient);

  // =========================
  // SAFETY FALLBACK
  // =========================
  if (!results || results.length === 0) {
    results = [{
      label: "No IMCI danger signs detected",
      level: "GREEN",
      action: "home_care"
    }];
  }

  // =========================
  // BREATHING OVERRIDE (WHO)
  // =========================
  if (breathClass === "SEVERE_PNEUMONIA") {
    results.unshift({
      label: "Fast breathing (WHO IMCI)",
      level: "RED",
      action: "refer_immediately"
    });
  }

  if (breathClass === "PNEUMONIA") {
    results.unshift({
      label: "Fast breathing (WHO IMCI)",
      level: "ORANGE",
      action: "treat_pneumonia"
    });
  }

  // =========================
  // NORMALIZE + SAVE
  // =========================
  patient.id = String(patient.id);

  const record = createPatient({
    id: patient.id,
    ...patient,
    respiratoryRate: patient.respiratoryRate,
    breathingClassification: breathClass,
    classifications: results,
    treatments: results.map(r => r.action)
  }, true);

  await savePatient(record);

  // ✅ IMPORTANT: keep reference for QR / edit
  window.currentPatient = record;
  patient = { ...record };

  // =========================
  // PREP UI DATA
  // =========================
  const currentLang = typeof lang !== "undefined" ? lang : "en";

  const uniqueResults = [];
  const seen = new Set();

  results.forEach(r => {
    const key = r.label + JSON.stringify(r.action);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  });

  const hasRed = uniqueResults.some(r => r.level === "RED");

  // =========================
  // TREATMENT UI
  // =========================
  const treatmentHTML = uniqueResults.map(r => {
    const actions = Array.isArray(r.action) ? r.action : [r.action];

    return actions.map(a => {
      const t = treatmentMap?.[a] || {
        title: { en: a },
        steps: [{ en: "No treatment defined yet" }]
      };

      return `
        <div class="${r.level.toLowerCase()}">
          <h3>${r.label} (${r.level})</h3>

          <div class="treatment">
            <h4>${t.title[currentLang] || t.title.en}</h4>

            ${t.drugs ? `<h5>Medication</h5>` : ""}
            ${t.drugs ? t.drugs.map(d => `
              <div class="drug">
                <strong>${d.name}</strong><br>
                Dose: ${typeof d.dose === "function" ? d.dose(patient) : d.dose}<br>
                Duration: ${d.duration || ""}
              </div>
            `).join("") : ""}

            ${t.steps ? `<h5>Instructions</h5><ul>
              ${t.steps.map(s => `<li>${s[currentLang] || s.en}</li>`).join("")}
            </ul>` : ""}

            ${t.advice ? `<h5>Advice</h5><ul>
              ${t.advice.map(a => `<li>${a[currentLang] || a.en}</li>`).join("")}
            </ul>` : ""}

            ${t.notes ? `<h5>Notes</h5><ul>
              ${t.notes.map(n => `<li>${n[currentLang] || n.en}</li>`).join("")}
            </ul>` : ""}

            ${t.dose ? `<p><strong>Dose:</strong> ${
              typeof t.dose === "function" ? t.dose(patient) : t.dose
            }</p>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }).join("");

  // =========================
  // COUNSELING UI
  // =========================
  const counselingKeys = getCounselingKeys(patient);

  let counselingHTML = counselingKeys.map(key => {
    const c = counselingMap[key];
    if (!c) return "";

    return `
      <div class="card">
        <h3>${key} Advice</h3>

        ${c.advice ? `
          <ul>
            ${c.advice.map(a => `<li>${a[currentLang] || a.en}</li>`).join("")}
          </ul>
        ` : ""}

        ${c.returnSigns ? `
          <h4>Return immediately if:</h4>
          <ul>
            ${c.returnSigns.map(r => `<li>${r[currentLang] || r.en}</li>`).join("")}
          </ul>
        ` : ""}

        ${c.followUp ? `
          <p><strong>Follow-up:</strong> ${c.followUp}</p>
        ` : ""}
      </div>
    `;
  }).join("");

  if (hasRed) {
    counselingHTML += `
      <div class="card red">
        <h3>EMERGENCY</h3>
        <p>Go to hospital immediately. Do not delay.</p>
      </div>
    `;
  }

  // =========================
  // MAP BUTTON
  // =========================
  const mapLinkHTML = `
    <div class="card">
      <button onclick="goToMap()">Check Nearest Hospital</button>
    </div>
  `;

  // =========================
  // FINAL RENDER (NO OVERRIDE BUG)
  // =========================
  screen.innerHTML = `
    <div class="card">
      <h2>Assessment Result</h2>

      <p><strong>Age:</strong> ${patient.ageDays} days</p>
      <p><strong>Weight:</strong> ${patient.weight} kg</p>
      <p><strong>Respiratory Rate:</strong> ${patient.respiratoryRate || "Not recorded"} breaths/min</p>

      ${treatmentHTML}
      ${counselingHTML}
      ${mapLinkHTML}

      <button onclick="viewPatient('${record.id}')">View Record</button>
      <button onclick="start()">New Patient</button>
    </div>
  `;
}

window.saveIntake = saveIntake;
window.ans = ans;
window.ansNum = ansNum;
window.ansSel = ansSel;
window.showPatientList = showPatientList;
window.viewPatient = viewPatient;
window.editPatient = editPatient;
window.saveEdit = saveEdit;
window.start = start;
start();
