// ==========================
// GLOBAL STATE
// ==========================
let patient = {};
let appMode = "public"; // DEFAULT: public
window.step = 0;
let flow = [];
let lang = "en";
let isProcessing = false;
let inFlow = false;


const WORKER_CODE = "1234"; // change this

function unlockWorkerMode() {
  const code = prompt("Enter Health Worker Code:");

  if (code === WORKER_CODE) {
    appMode = "worker";
    alert("Access granted");
    safeRefresh();
  } else {
    alert("Invalid code");
  }
}

function logoutWorkerMode() {
  appMode = "public";
  alert("Logged out");

  patient = {};
  inFlow = false;
  step = 0;

  start(); // go back to intake
}


Object.defineProperty(window, "step", {
  set(v) {
    console.trace("STEP CHANGED:", v);
    window._step = v;
  },
  get() {
    return window._step;
  }
});

const screen = document.getElementById("app");

// ==========================
// UI HELPERS
// ==========================
function render(html) {
  screen.innerHTML = html;
}

function card(content) {
  return `<div class="card">${content}</div>`;
}

function button(label, action, cls = "") {
  return `<button class="${cls}" data-action="${action}">${label}</button>`;
}

function formatAgeYMD(days) {
  if (!days) return "-";

  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  const d = days % 30;

  return `${y}y ${m}m ${d}d`;
}

function calculateAgeDays(dob) {
  if (!dob) return 0;

  const birth = new Date(dob);
  const today = new Date();

  if (birth > today) return 0; // ❗ future date protection

  const diff = today - birth;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ==========================
// EVENT DELEGATION
// ==========================

    document.addEventListener("change", (e) => {
  if (e.target.id === "dob") {
    const days = calculateAgeDays(e.target.value);
    const ageInput = document.getElementById("age");
  if (ageInput) ageInput.value = days || "";
  }
});

screen.addEventListener("click", async (e) => {
const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (isProcessing) return;
  if (action === "unlock") return unlockWorkerMode();
  if (action === "logout") return logoutWorkerMode();
  if (action === "records") {
  if (appMode === "public") {
    alert("Access restricted in Public Mode");
    return;
  }
  return showPatientList();
}


  // const action = btn.dataset.action;

  try {
    if (action === "next-intake") return saveIntake();
    // if (action === "records") return showPatientList();
    if (action === "yes") return ans(true);
    if (action === "no") return ans(false);
    if (action === "next-num") return ansNum();
    if (action === "next-sel") return ansSel();
    if (action === "restart") return start();

    if (action === "delete") {
      const id = e.target.dataset.id;
      if (!id) return;

      if (!confirm("Delete this record?")) return;

      await deletePatient(id);
      return showPatientList();
    }

    if (action === "view") {
  const id = e.target.dataset.id;
  if (!id) return;

  const p = await getPatient(id);
  if (!p) throw new Error("Record not found");

  patient = p;

  return render(card(`
    <div class="report-header">
      <img src="ravenbilLogo.png" class="logoRender">
      <div class="company">
        <h2>RAVENBIL</h2>
        <p>Research and Experimental Development in Engineering and Technology</p>
      </div>
    </div>

    <h2>Patient Record</h2>

    <div class="section">
    <div class="section">
  <h3>Record Info</h3>

  <div class="patient-grid">

    <div class="field">
      <label>Patient ID:</label>
      <span>${p.patientId || "-"}</span>
    </div>

    <div class="field">
      <label>Revision:</label>
      <span>${p._rev || "-"}</span>
    </div>

    <div class="field">
      <label>Created At:</label>
      <span>${new Date(p.createdAt).toLocaleString()}</span>
    </div>

    <div class="field">
      <label>Updated At:</label>
      <span>${new Date(p.updatedAt).toLocaleString()}</span>
    </div>

  </div>
</div>
      <h3>Basic Info</h3>
<div class="patient-grid">


  <div class="field">
    <label>Name:</label>
    <span>${p.name || "-"}</span>
  </div>

  <div class="field">
    <label>DOB:</label>
    <span>${p.dob || "-"}</span>
  </div>

  <div class="field">
    <label>Age:</label>
    <span>${formatAgeYMD(p.ageDays)}</span>
  </div>

  <div class="field">
    <label>Weight:</label>
    <span>${p.weight || "-"} kg</span>
  </div>

  <div class="field">
  <label>Visit Type:</label>
  <span>${p.analytics?.visitType || "-"}</span>
</div>

</div>
    </div>

    <div class="section">
      <h3>Clinical Data</h3>
      ${buildClinicalData(p)}
    </div>

    <div class="section">
      <h3>Assessment</h3>
      ${buildAssessment(p.classifications)}
    </div>

    <div class="section">
      <h3>Timeline</h3>
      ${buildTimeline(p)}
    </div>

    <div class="actions">
      <button data-action="records">Back</button>
      <button data-action="reassess" data-id="${p._id}">New Assessment</button>
      <button data-action="restart">Exit</button>
      <button onclick="printRecord()">Print</button>
    </div>
  `));
}

    if (action === "reassess") {
      return handleReassess(btn);
    }

  } catch (err) {
    console.error("ACTION ERROR:", err);

    render(card(`
      <h3>Something went wrong</h3>
      <p>${err.message}</p>
      <button data-action="restart">Restart</button>
    `));
  }



  if (isProcessing) return;
});


async function handleReassess(btn) {
  const id = btn.dataset.id;

  const existing = await getPatient(id);
  if (!existing) {
    alert("Patient not found");
    return;
  }

  patient = { ...existing }; // ✅ KEEP FULL DATA

  initFlow();
}


document.addEventListener("input", (e) => {
  if (e.target.id !== "searchInput") return;

  const query = e.target.value.toLowerCase().trim();
  const items = document.querySelectorAll(".patient-item");

  items.forEach(item => {
    const name = item.dataset.name;
    const dob = item.dataset.dob;
    const id = item.dataset.recordid;

    // Match rules:
    // 1. ID match
    // 2. Name match
    // 3. Name + DOB combined match
    const match =
      id.includes(query) ||
      name.includes(query) ||
      (name + dob).replace(/-/g, "").includes(query.replace(/-/g, ""));

    item.style.display = match ? "block" : "none";
  });
});



///Switch




// function safeRefresh() {
//   // detect current screen instead of forcing navigation

//   if (flow && flow.length && step < flow.length) {
//     renderQuestion(flow[step]);
//     return;
//   }

//   if (window._lastScreen === "records") {
//     showPatientList();
//     return;
//   }

//   intake();
// }
function safeRefresh() {
  if (inFlow) {
    renderQuestion(flow[step]);
    return;
  }

  if (window._lastScreen === "records") {
    showPatientList();
    return;
  }

  intake();
}

function setScreen(name) {
  window._lastScreen = name;
}

// ==========================
// Make keys human-readable (CRITICAL)
// ==========================

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase());
}



// ==========================
// Mode Switch UI
// ==========================

function renderModeSwitch() {
  return `
    <div class="mode-switch">
      <label>
        <input type="checkbox" id="modeToggle" ${appMode === "worker" ? "checked" : ""}>
        🏥 Health Worker Mode
      </label>
      <small>Current: ${appMode.toUpperCase()}</small>
    </div>
  `;
}

// ==========================
// Clinical Data (auto-scan patient answers)
// ==========================

function buildClinicalData(p) {
  const ignore = ["name", "ageDays", "weight", "classifications", "_id", "history", "createdAt", "updatedAt", "_rev", "dob", "firstName", "lastName", "location", "patientId",  "startTime", "analytics"]

  const formatValue = (v) => {
    if (v === null || v === undefined || v === "") return "—";

    if (typeof v === "boolean") {
      return v ? "Yes" : "No";
    }

    if (Array.isArray(v)) {
      return v.length ? v.join(", ") : "—";
    }

    if (typeof v === "object") {
      return JSON.stringify(v);
    }

    return v;
  };

  return Object.entries(p)
    .filter(([k]) => !ignore.includes(k))
    .map(([k, v]) => {
      const value = formatValue(v);

      const isDanger =
        value === "Yes" || value === true;

      return `
        <div class="clinical-item">
          <span class="clinical-label">${formatKey(k)}:</span>
          <span class="clinical-value ${isDanger ? "danger" : ""}">
            ${value}
          </span>
        </div>
      `;
    })
    .join("");
}

// ==========================
// Assessment (clean classification display)
// ==========================
function buildAssessment(classifications = []) {
  if (!classifications.length) return "<p>No assessment</p>";

  return classifications.map(c => `
    <div class="result ${c.level.toLowerCase()}">
      <strong>${c.label}</strong><br>
      Severity: ${c.level}
    </div>
  `).join("");
}

// ==========================
// Render timeline
// ==========================
function buildTimeline(p) {
  if (!p.history || !p.history.length) {
    return "<p>No history</p>";
  }
  console.log("HISTORY DEBUG:", p.history);

  return p.history.map(h => {
    const s = h.soap || {}; // 🔥 USE SOAP NOW (not snapshot)

    return `
      <div class="card">
        <strong>${new Date(h.date).toLocaleString()}</strong>

        <div class="section">
          <strong>S (Subjective):</strong>
          <p>${s.subjective || "-"}</p>
        </div>

        <div class="section">
          <strong>O (Objective):</strong>
          <p>${s.objective || "-"}</p>
        </div>

        <div class="section">
          <strong>A (Assessment):</strong>
          <p>${s.assessment || "-"}</p>
        </div>

        <div class="section">
          <strong>P (Plan):</strong>
          <p>${s.plan || "-"}</p>
        </div>

        ${h.note ? `
          <div class="section">
            <strong>Doctor Note:</strong>
            <p>${h.note}</p>
          </div>
        ` : ""}
                ${h.doctor ? `
          <div class="section">
            <strong>Doctor:</strong>
            <p>${h.doctor.name || "-"}</p>

            <strong>Signature:</strong>
            <p class="signature">${h.doctor.signature || "-"}</p>
          </div>
        ` : ""}

      </div>
    `;
  }).join("");
}

// ==========================
// history important findings
// ==========================

function buildKeyFindings(s) {
  const findings = [];

  if (s.unableToDrink) findings.push("Unable to drink");
  if (s.convulsions) findings.push("Convulsions");
  if (s.lethargic) findings.push("Lethargic/unconscious");
  if (s.fever) findings.push("Fever");
  if (s.lowTemp) findings.push("Low body temperature");

  if (!findings.length) {
    return "<li>No critical findings</li>";
  }

  return findings.map(f => `<li>${f}</li>`).join("");
}


// ==========================
// PATIENT IDENTITY MATCHING
// ==========================

function normalize(str) {
    return (str || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

async function findExistingPatient(firstName, lastName, dob) {
  const all = await getAllPatients();

  return all.find(p =>
    normalize(p.firstName) === normalize(firstName) &&
    normalize(p.lastName) === normalize(lastName) &&
    p.dob === dob
  );
}
// ==========================
// SOAP OBJECT
// ==========================
function buildSOAP(patient, classifications) {
  return {
    subjective: buildSubjective(patient),
    objective: buildObjective(patient),
    assessment: classifications.map(c => c.label).join(", "),
    plan: classifications.map(c => c.action).flat().join(", ")
  };
}

function isMeaningfulSOAP(soap) {
  if (!soap) return false;

  const clean = (v) =>
    (v || "")
      .toString()
      .replace(/[-–—]/g, "") // remove dashes
      .trim()
      .toLowerCase();

  const s = clean(soap.subjective);
  const o = clean(soap.objective);
  const a = clean(soap.assessment);
  const p = clean(soap.plan);

  return !!(s || o || a || p);
}
// ==========================
// OBJECTIVE MEASURE
// ==========================
function buildObjective(p) {
  const o = [];

  if (p.weight) o.push(`Weight: ${p.weight} kg`);
  if (p.temperature) o.push(`Temp: ${p.temperature} °C`);
  if (p.ageDays) o.push(`Age: ${formatAgeYMD(p.ageDays)}`);

  return o.join(", ");
}
// ==========================
// SUBJECTIVE SYMPTOMS
// ==========================
function buildSubjective(p) {
  const s = [];

  if (p.unableToDrink) s.push("Unable to drink");
  if (p.convulsions) s.push("Convulsions");
  if (p.lethargic) s.push("Lethargic/unconscious");
  if (p.fever) s.push("Fever reported");

  return s.length ? s.join(", ") : "No reported symptoms";
}

// ==========================
// START
// ==========================
function start() {
  patient = {};
  intake();
}

// ==========================
// INTAKE
// ==========================

function intake() {
  setScreen("intake");
  render(card(`
    

    <h2>Patient Intake</h2>


    ${appMode === "worker" ? `
      <input id="firstName" placeholder="First Name">
      <input id="lastName" placeholder="Surname">
    ` : `
      <p><strong>Public Mode:</strong> Anonymous patient intake</p>
    `}

    <label for="dob"><strong>Date of Birth🔽</strong></label>
    <input id="dob" type="date">
    <input id="age" type="number" placeholder="Age (days)" readonly>
    <input id="weight" type="number" placeholder="Weight (kg)">

    ${button("Next", "next-intake", "primary")}
    ${appMode === "worker" ? button("Records", "records") : ""}
      ${appMode === "public" 
  ? button("Health Worker Login", "unlock", "primary") 
  : ""
}
${appMode === "worker" 
  ? button("Logout", "logout", "danger") 
  : ""
}
  `));
}

async function saveIntake() {
  // const firstName = document.getElementById("firstName").value.trim();
  // const lastName = document.getElementById("lastName").value.trim();
  // const name = `${firstName} ${lastName}`.trim();
  const firstName = appMode === "worker"
  ? document.getElementById("firstName")?.value.trim()
  : "Anonymous";

const lastName = appMode === "worker"
  ? document.getElementById("lastName")?.value.trim()
  : "";

const name = appMode === "worker"
  ? `${firstName} ${lastName}`.trim()
  : "Anonymous Patient";
  const dob = document.getElementById("dob").value;
  const ageDays = Number(document.getElementById("age").value);
  const weight = Number(document.getElementById("weight").value);

  if (!name || !dob || !ageDays || !weight) {
    return alert("Complete all fields");
  }

  // 🔥 CHECK EXISTING PATIENT
  // const existing = await findExistingPatient(firstName, lastName, dob);
  let existing = null;

  if (appMode === "worker") {
    existing = await findExistingPatient(firstName, lastName, dob);
  }

  if (existing) {
    if (!confirm("Patient already exists. Continue new assessment?")) return;

    patient = { ...existing }; // load existing
  } else {
    patient = {};
  }

  // update fields
  patient.firstName = firstName;
  patient.lastName = lastName;
  patient.name = name;
  patient.dob = dob;
  patient.ageDays = ageDays;
  patient.weight = weight;
  patient.startTime = Date.now();
  patient.patientId = patient._id || patient.patientId || crypto.randomUUID();


  // ==========================
// LOCATION CAPTURE (ADD)
// ==========================
let loc = null;

try {
  if (typeof getSmartLocation === "function") {
    loc = await getSmartLocation();
  }
} catch (e) {
  console.warn("Location failed:", e);
}

// ✅ NEVER ALLOW undefined
loc = loc || {};

const safeLoc = {
  lat: typeof loc.lat === "number" ? loc.lat : null,
  lng: typeof loc.lng === "number" ? loc.lng : null,
  city: loc.city ?? "Unknown",
  region: loc.region ?? "Unknown",
  country: loc.country ?? "Unknown",
  accuracy: loc.accuracy ?? null,
  source: loc.source || "fallback"
};

patient.location = {
  ...safeLoc,
  geoHash:
  safeLoc.lat !== null && safeLoc.lng !== null
    ? `${safeLoc.lat.toFixed(2)},${safeLoc.lng.toFixed(2)}`
    : null,
  timestamp: new Date().toISOString()
};
console.log("FINAL LOCATION:", patient.location);
  initFlow();
}
// ==========================
// INIT FLOW
// ==========================
function initFlow() {
  step = 0;
  inFlow = true; 

  flow = patient.ageDays < 60 ? infantFlow : childFlow;

   if (!Array.isArray(flow)) {
    console.error("FLOW ERROR:", flow);
    flow = [];
  }

  updateProgress();
  next();
}

// ==========================
// NEXT STEP
// ==========================
function next() {
  if (!inFlow) return;
  while (step < flow.length) {
    const q = flow[step];

    if (q.when && !q.when(patient)) {
      step++;
      continue;
    }
    break;
  }

  if (step >= flow.length) {
  console.log("FLOW COMPLETE → RESULT");
  return result();
}

  updateProgress();
  renderQuestion(flow[step]);
}

// ==========================
// QUESTION RENDERER
// ==========================
function renderQuestion(q) {
  updateProgress();
  const label = q.label?.[lang] || q.label;

  if (q.type === "boolean") {
    render(card(`
      <h2>${label}</h2>
      <div class="actions">
        ${button("Yes", "yes", "primary")}
        ${button("No", "no")}
      </div>
    `));
  }

  else if (q.type === "number") {
    render(card(`
      <h2>${label}</h2>
      <input id="val" type="number">
      ${button("Next", "next-num", "primary")}
    `));
  }

  else if (q.type === "select") {
    render(card(`
      <h2>${label}</h2>
      <select id="val">
        <option value="">-- Select --</option>
        ${q.options.map(o => `
          <option value="${o.value}">
            ${o.label?.[lang] || o.label}
          </option>
        `).join("")}
      </select>
      ${button("Next", "next-sel", "primary")}
    `));
  }
}

// ==========================
// ANSWERS
// ==========================
function ans(value) {
   if (!inFlow) return;
  const q = flow[step];
  if (!q) return;

  patient[q.id] = value;

  // LIMITED early exit (only critical)
  if (patient.ageDays < 60) {
    if (
      patient.unableToDrink ||
      patient.convulsions ||
      patient.lethargic
    ) {
      // step = flow.length;
      // return next();
      patient.hasDangerSigns = true; 
    }
  }

  step++;
  updateProgress();
  next();
}

function ansNum() {
   if (!inFlow) return;
  const val = document.getElementById("val").value;
  if (val === "") return alert("Enter value");

  const q = flow[step];
  patient[q.id] = Number(val);

  if (q.id === "temperature") {
    patient.fever = patient.temperature >= 37.5;
    patient.lowTemp = patient.temperature < 35.5;
  }

  step++;
  updateProgress();
  next();
}

function ansSel() {
   if (!inFlow) return;
  const val = document.getElementById("val").value;
  if (!val) return alert("Select a value");

  const q = flow[step];
  patient[q.id] = val;

  step++;
  updateProgress();
  next();
}



// ==========================
// PATIENT LIST (CRUD VIEW)
// ==========================
async function showPatientList() {
  if (appMode !== "worker") {
    alert("Unauthorized");
    return;
  }
  setScreen("records");
  try {
    if (typeof showPatientList !== "function") {
  console.error("❌ showPatientList missing (scope issue)");

  render(card(`
    <h3>System Error</h3>
    <p>Records module not loaded</p>
    <button data-action="restart">Restart</button>
  `));
  return;
}

    const data = await getAllPatients();

    if (!data || !data.length) {
      return render(card("<h3>No records yet</h3>"));
    }

    if (appMode === "public") {
  render(card(`
    ${renderModeSwitch()}
    <h3>Records Disabled</h3>
    <p>Public mode does not allow record browsing.</p>
  `));
  return;
}

    render(card(`
  <h2>Patient Records</h2>

  <input 
    id="searchInput" 
    placeholder="Search by ID or Name + DOB..."
    style="width:100%; padding:10px; margin-bottom:10px;"
  />

  <div id="patientList">
    ${data.map(p => `
      <div class="card patient-item"
           data-id="${p._id}"
           data-name="${(p.name || "").toLowerCase()}"
           data-dob="${p.dob || ""}"
           data-recordid="${p._id || ""}">

        <strong>${p.name || "No name"}</strong><br>
        Age: ${formatAgeYMD(p.ageDays)} days<br>
        Weight: ${p.weight || "-"} kg

        <div class="actions">
          <button data-action="view" data-id="${p._id}">View</button>
          <button data-action="delete" data-id="${p._id}">Delete</button>
        </div>
      </div>
    `).join("")}
  </div>
`));

  } catch (err) {
    console.error("showPatientList error:", err);

    render(card(`
      <h3>Error loading records</h3>
      <p>${err.message}</p>
      <button data-action="restart">Back</button>
    `));
  }
}



// ==========================
// RESULT
// ==========================
async function result() {

  if (isProcessing) {
    console.warn("🚫 BLOCKED duplicate result()");
    return;
  }

  isProcessing = true;
  inFlow = false;
  step = flow.length;

  render(card(`<h2>Processing...</h2>`));
  await new Promise(r => setTimeout(r, 50));

  let results = patient.ageDays < 60
    ? classifyInfant?.(patient)
    : classifyChild?.(patient);

  if (!Array.isArray(results)) {
    results = [{
      label: "No IMCI classification",
      level: "GREEN",
      action: "HOME"
    }];
  }

  results = results.map(r => ({
    ...r,
    action: Array.isArray(r.action)
      ? r.action
      : String(r.action).split(",").map(a => a.trim())
  }));

  results = prioritize(results);

  const soap = buildSOAP(patient, results);

  // ==========================
// ANALYTICS BLOCK 
// ==========================
const analytics = {
  timestamp: new Date().toISOString(),

  ageGroup: patient.ageDays < 60 ? "infant" : "child",

  severity: results[0]?.level || "UNKNOWN",

  classifications: results.map(r => r.label),

  hasDangerSigns: !!patient.hasDangerSigns,

  visitType: patient._id ? "followup" : "new",

  outcome: "unknown", // keep simple for now

  location: patient.location || null
};

// attach to patient
patient.analytics = analytics;

  let record = null;

  // ==========================
  // 🔒 ONLY DB PART IS CONDITIONAL
  // ==========================
  if (appMode === "worker") {

    if (patient._id) {
      record = await getPatient(patient._id);

      record = {
        ...record,
        ...patient,
        history: record.history || [],
        classifications: results,
        updatedAt: new Date().toISOString()
      };

    } else {
      record = await createPatient({
        ...patient,
        classifications: results
      });
    }
    

    record.history = record.history || [];

    const doctorName = prompt("Doctor Name:");
    const signature = prompt("Signature:");

    if (isMeaningfulSOAP(soap)) {
      const last = record.history[record.history.length - 1];

      const isDuplicate =
        last &&
        last.soap &&
        JSON.stringify(last.soap) === JSON.stringify(soap);

      if (!isDuplicate) {
        record.history.push({
          date: new Date().toISOString(),
          soap,
          doctor: {
            name: doctorName || "Unknown",
            signature: signature || "-"
          },
          locked: true
        });
      }
    }

    await savePatient(record);

  
// ==========================
// CREATE HEALTH EVENT 
// ==========================
await createHealthEvent({
  patientId: patient._id,

  timestamp: analytics.timestamp,
  ageGroup: analytics.ageGroup,
  severity: analytics.severity,

  primaryClassification: results[0]?.label || "UNKNOWN",
  classifications: analytics.classifications,

  hasDangerSigns: analytics.hasDangerSigns,
  visitType: analytics.visitType,

  outcome: analytics.outcome,

  // 🔥 FLATTENED LOCATION
  lat: patient.location?.lat || null,
  lng: patient.location?.lng || null,
  city: patient.location?.city || null,
  region: patient.location?.region || null,
  country: patient.location?.country || null,
  geoHash: patient.location?.geoHash || null,

  duration: patient.startTime
    ? Date.now() - patient.startTime
    : null
});

    patient = { ...record };

  } else {
    // PUBLIC MODE
    console.log("Public mode → not saving");
    patient.classifications = results;
  }
      


/////DDDDDEEEEEEBBUUGGGGG
const healthEvent = {
  patientId: patient._id,

  timestamp: analytics.timestamp,
  ageGroup: analytics.ageGroup,
  severity: analytics.severity,

  primaryClassification: results[0]?.label || "UNKNOWN",
  classifications: analytics.classifications,

  hasDangerSigns: analytics.hasDangerSigns,
  visitType: analytics.visitType,

  outcome: analytics.outcome,

  lat: patient.location?.lat || null,
  lng: patient.location?.lng || null,
  city: patient.location?.city || null,
  region: patient.location?.region || null,
  country: patient.location?.country || null,
  geoHash: patient.location?.geoHash || null,

  duration: patient.startTime
    ? Date.now() - patient.startTime
    : null
};

console.log("FINAL LOCATION:", patient.location);

console.log("📊 HEALTH EVENT:", healthEvent);

await createHealthEvent(healthEvent);



















  // ==========================
  // ✅ ALWAYS RUN UI
  // ==========================
  setScreen("result");
  render(buildResultUI(results));

  isProcessing = false;
}

async function createHealthEvent(event) {
  if (!event) return;

  try {
    const doc = {
      _id: "event_" + Date.now(), // simple unique id

      ...event,

      createdAt: new Date().toISOString()
    };

    await eventsDB.put(doc);

  } catch (e) {
    console.error("HealthEvent error:", e);
  }
}
// ==========================
// RESULT UI
// ==========================
function buildResultUI(results) {

  const currentLang = lang;

  const resultHTML = results.map(r => {

    const actions = r.action;

    const treatmentHTML = actions.map(a => {
      const t = treatmentMap[a];

      if (!t) return `<p>No treatment defined (${a})</p>`;

      return `
        <div class="treatment">
          <h4>${t.title?.[currentLang] || t.title?.en}</h4>

          ${t.drugs ? `
            <h5>Medication</h5>
            ${t.drugs.map(d => `
              <div class="drug">
                <strong>${d.name}</strong><br>
                Dose: ${typeof d.dose === "function" ? d.dose(patient) : d.dose}<br>
                ${d.duration ? `Duration: ${d.duration}` : ""}
              </div>
            `).join("")}
          ` : ""}

          ${t.steps ? `
            <ul>
              ${t.steps.map(s => `<li>${s[currentLang] || s.en}</li>`).join("")}
            </ul>
          ` : ""}

          ${t.dose ? `
            <p><strong>Dose:</strong> ${
              typeof t.dose === "function" ? t.dose(patient) : t.dose
            }</p>
          ` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="result ${r.level.toLowerCase()}">
        <h3>${r.label}</h3>
        <p><strong>${r.level}</strong></p>
        ${treatmentHTML}
      </div>
    `;
  }).join("");




  // ======================
  // COUNSELING
  // ======================
  const counselingKeys = getCounselingKeys(patient);

  const counselingHTML = counselingKeys.map(k => {
    const c = counselingMap[k];
    if (!c) return "";

    return `
      <div class="card">
        <h4>${k}</h4>

        ${c.advice ? `
          <ul>
            ${c.advice.map(a => `<li>${a[currentLang] || a.en}</li>`).join("")}
          </ul>
        ` : ""}

        ${c.returnSigns ? `
          <h5>Return if:</h5>
          <ul>
            ${c.returnSigns.map(r => `<li>${r[currentLang] || r.en}</li>`).join("")}
          </ul>
        ` : ""}

        ${c.followUp ? `<p><strong>Follow-up:</strong> ${c.followUp}</p>` : ""}
      </div>
    `;
  }).join("");

  return card(`
    <h2>Assessment Result</h2>
    <p><strong>Patient:</strong> ${patient.name || "-"}</p>
    <p><strong>Age:</strong> ${patient.ageDays} days</p>
    <p><strong>Weight:</strong> ${patient.weight} kg</p>

    ${resultHTML}

    <div class="section">
      <h3>Caregiver Advice</h3>
      ${counselingHTML}
    </div>

    <div class="actions">
      ${button("New Patient", "restart")}
    </div>
  `);
}


// ==========================
// Progressive Bar
// ==========================

function updateProgress() {
  const bar = document.getElementById("progressBar");
  const text = document.getElementById("progressText");

  if (!bar || !Array.isArray(flow) || flow.length === 0) return;

  // 🔥 ALWAYS READ FROM SINGLE SOURCE OF TRUTH
  const currentStep = Number(step ?? 0);

  const total = flow.length;
  const current = Math.min(currentStep + 1, total);

  const percent = (current / total) * 100;

  bar.style.width = percent + "%";
  text.textContent = `Step ${current} of ${total}`;
}
// ==========================
// health check system
// ==========================

function systemCheck() {
  return {
    pouchdb: typeof PouchDB !== "undefined",
    dbReady: !!db,
    online: navigator.onLine
  };
}

function safeCall(fn, fallback) {
  if (typeof fn !== "function") {
    console.warn("Missing function:", fn);
    return fallback?.();
  }
  return fn();
}

function safeRender(fn) {
  try {
    fn();
  } catch (err) {
    console.error("Render error:", err);
    render(card(`
      <h3>UI Error</h3>
      <p>${err.message}</p>
    `));
  }
}

window.addEventListener("load", () => {
  if (typeof showPatientList !== "function") {
    console.warn("showPatientList missing at startup");
  }
});

// ==========================
// Geo SamrtLocation
// ==========================

async function getSmartLocation() {
  let loc = null;

  // ==========================
  // 1. TRY GPS
  // ==========================
  try {
    loc = await getGPSLocation();
  } catch (e) {
    console.warn("GPS failed:", e);
  }

  // ==========================
  // 2. TRY IP FALLBACK
  // ==========================
  if (!loc) {
    try {
      loc = await getIPLocation();
    } catch (e) {
      console.warn("IP failed:", e);
    }
  }

  // ==========================
  // 3. IF WE HAVE LAT/LNG → ENRICH (YOUR CODE GOES HERE)
  // ==========================
  if (loc?.lat && loc?.lng) {
    const place = await reverseGeocode(loc.lat, loc.lng);

    const finalLoc = { ...loc, ...place };
    finalLoc.lat = Number(finalLoc.lat.toFixed(3));
    finalLoc.lng = Number(finalLoc.lng.toFixed(3));

    saveLastLocation(finalLoc); // ✅ cache it

    return finalLoc;
  }

  // ==========================
  // 4. OFFLINE CACHE FALLBACK (YOUR CODE GOES HERE)
  // ==========================
  const cached = getLastLocation();
  if (cached) {
    return {
      ...cached,
      source: "cache"
    };
  }

  // ==========================
  // 5. FINAL HARD FALLBACK
  // ==========================
  return {
    lat: null,
    lng: null,
    city: "Unknown",
    region: "Unknown",
    country: "Unknown",
    source: "fallback"
  };
}

// ==========================
// Reverse Geocoding API
// ==========================

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    const data = await res.json();

    const addr = data.address || {};

    return {
      city: addr.city || addr.town || addr.village || "Unknown",
      region: addr.state || addr.region || "Unknown",
      country: addr.country || "Unknown"
    };

  } catch (e) {
    console.warn("Reverse geocode failed:", e);
    return {
      city: "Unknown",
      region: "Unknown",
      country: "Unknown"
    };
  }
}

// ==========================
// IP Fallback
// ==========================
async function getIPLocation() {
  const res = await fetch("https://ipapi.co/json/");
  const data = await res.json();

  return {
    lat: data.latitude,
    lng: data.longitude,
    city: data.city,
    region: data.region,
    country: data.country_name,
    source: "ip"
  };
}

// ==========================
// GPS
// ==========================
function getGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps"
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  });
}
// ==========================
// Cache for offline use
// ==========================

function saveLastLocation(loc) {
  localStorage.setItem("lastLocation", JSON.stringify(loc));
}

function getLastLocation() {
  try {
    return JSON.parse(localStorage.getItem("lastLocation"));
  } catch {
    return null;
  }
}

// ==========================
// INIT
// ==========================
start();