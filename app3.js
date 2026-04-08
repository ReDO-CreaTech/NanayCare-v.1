// ==========================
// GLOBAL SAFETY
// ==========================
document.addEventListener("contextmenu", (e) => e.preventDefault());

if (typeof window.__ === "undefined") {
  window.__ = (key) => key;
}

// ==========================
// STATE
// ==========================
let patient = { id: `p_${Date.now()}` };
let step = 0;
let flow = [];
let lang = "en";

const screen = document.getElementById("screen");

// ==========================
// HELPERS
// ==========================
function isValidFlow(f) {
  return Array.isArray(f) && f.length > 0;
}

function getFlowForPatient() {
  if (!window.infantFlow || !window.childFlow) {
    return null;
  }

  return patient.ageDays < 60 ? window.infantFlow : window.childFlow;
}

// ==========================
// START
// ==========================
function start() {
  step = 0;
  patient = { id: `p_${Date.now()}` };
  intake();
}

// ==========================
// INTAKE
// ==========================
function intake() {
  screen.innerHTML = `
    <div class="card">
      <input id="name" placeholder="Name">
      <input id="age" type="number" placeholder="Age (days)">
      <input id="weight" type="number" placeholder="Weight">

      <button onclick="saveIntake()">Next</button>
      <button onclick="showPatientList()">Records</button>
    </div>
  `;
}

function saveIntake() {
  const name = document.getElementById("name").value.trim();
  const age = Number(document.getElementById("age").value);
  const weight = Number(document.getElementById("weight").value);

  if (!name || isNaN(age) || isNaN(weight)) {
    return alert("Please fill all fields correctly");
  }

  patient.name = name;
  patient.ageDays = age;
  patient.weight = weight;

  initFlow();
}

// ==========================
// FLOW ENGINE
// ==========================
function initFlow() {
  step = 0;

  const selectedFlow = getFlowForPatient();

  if (!selectedFlow) {
    console.error("❌ Flow modules not loaded");
    return showError("Flow not loaded");
  }

  if (!isValidFlow(selectedFlow)) {
    console.error("❌ Invalid flow");
    return showError("No questions available");
  }

  flow = selectedFlow;

  next();
}

function next() {
  if (!isValidFlow(flow)) return;

  while (step < flow.length) {
    const q = flow[step];

    if (!q) {
      step++;
      continue;
    }

    if (typeof q.when === "function" && !q.when(patient)) {
      step++;
      continue;
    }

    break;
  }

  if (step >= flow.length) return result();

  const q = flow[step];

  if (!q || !q.type) {
    step++;
    return next();
  }

  renderQuestion(q);
}

function renderQuestion(q) {
  const label = q.label?.[lang] || q.label || "Question";

  if (q.type === "boolean") {
    screen.innerHTML = `
      <div class="card">
        <h2>${label}</h2>
        <button onclick="ans(true)">Yes</button>
        <button onclick="ans(false)">No</button>
      </div>
    `;
  }

  if (q.type === "number") {
    screen.innerHTML = `
      <div class="card">
        <h2>${label}</h2>
        <input id="val" type="number">
        <button onclick="ansNum()">Next</button>
      </div>
    `;
  }

  if (q.type === "select") {
    screen.innerHTML = `
      <div class="card">
        <h2>${label}</h2>
        <select id="val">
          ${(q.options || []).map(o => `
            <option value="${o.value}">
              ${o.label?.[lang] || o.label}
            </option>
          `).join("")}
        </select>
        <button onclick="ansSel()">Next</button>
      </div>
    `;
  }
}

// ==========================
// ANSWERS
// ==========================
function ans(value) {
  const q = flow[step];
  if (!q) return;

  patient[q.id] = value;

  step++;
  next();
}

function ansNum() {
  const input = document.getElementById("val");
  const val = Number(input.value);

  if (input.value === "" || isNaN(val)) {
    return alert("Enter a valid number");
  }

  const q = flow[step];
  patient[q.id] = val;

  step++;
  next();
}

function ansSel() {
  const q = flow[step];
  const val = document.getElementById("val").value;

  patient[q.id] = val;

  step++;
  next();
}

// ==========================
// RESULT
// ==========================
async function result() {
  let results = [];

  try {
    const fn = patient.ageDays < 60
      ? window.classifyInfant
      : window.classifyChild;

    if (typeof fn === "function") {
      results = fn(patient);
    }
  } catch (e) {
    console.error("Classification error:", e);
  }

  if (!Array.isArray(results) || results.length === 0) {
    results = [{
      label: "No danger signs detected",
      level: "GREEN",
      action: "home_care"
    }];
  }

  const coords = await getLocationSafe();

  const record = {
    ...patient,
    id: String(patient.id),
    location: coords,
    classifications: results,
    treatments: results.map(r => r.action)
  };

  await savePatient(record);

  renderResult(record);
}

function renderResult(record) {
  screen.innerHTML = `
    <div class="card">
      <h2>Assessment Result</h2>
      <p><strong>Name:</strong> ${record.name}</p>
      <p><strong>Age:</strong> ${record.ageDays} days</p>
      <p><strong>Weight:</strong> ${record.weight}</p>

      <button onclick="viewPatient('${record.id}')">View Record</button>
      <button onclick="start()">New Patient</button>
    </div>
  `;
}

// ==========================
// PATIENT LIST
// ==========================
window.showPatientList = async function () {
  const patients = await getAllPatients();

  if (!patients.length) {
    return screen.innerHTML = `
      <div class="card">
        <h2>No Records</h2>
        <button onclick="start()">New</button>
      </div>
    `;
  }

  screen.innerHTML = `
    <div class="card">
      <h2>Patients</h2>
      ${patients.map(p => `
        <div onclick="viewPatient('${p.id}')">
          ${p.name || "Unnamed"}
        </div>
      `).join("")}
      <button onclick="start()">New</button>
    </div>
  `;
};

// ==========================
// VIEW
// ==========================
window.viewPatient = async function (id) {
  const p = await getPatientById(id);
  if (!p) return alert("Not found");

  patient = { ...p };

  screen.innerHTML = `
    <div class="card">
      <h2>${p.name}</h2>
      <p>Weight: ${p.weight}</p>
      <p>Age: ${p.ageDays}</p>

      <button onclick="start()">Back</button>
    </div>
  `;
};

// ==========================
// GEO
// ==========================
async function getLocationSafe() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// ==========================
// ERROR UI
// ==========================
function showError(msg) {
  screen.innerHTML = `
    <div class="card">
      <h2>Error</h2>
      <p>${msg}</p>
      <button onclick="start()">Retry</button>
    </div>
  `;
}

// ==========================
// EXPORTS
// ==========================
window.start = start;
window.saveIntake = saveIntake;
window.ans = ans;
window.ansNum = ansNum;
window.ansSel = ansSel;

// ==========================
// INIT
// ==========================
start();