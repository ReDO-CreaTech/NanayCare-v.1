// ==========================
// GLOBAL STATE
// ==========================
let patient = {};
let step = 0;
let flow = [];
let lang = "en";

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

// ==========================
// EVENT DELEGATION
// ==========================
screen.addEventListener("click", async (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  if (action === "medical-login") {
  return loginScreen();
  }

  try {
    if (action === "next-intake") return saveIntake();
    if (action === "records") {
      if (typeof showPatientList !== "function") {
        throw new Error("showPatientList not loaded");
      }
      return showPatientList();
    }

    if (action === "yes") return ans(true);
    if (action === "no") return ans(false);
    if (action === "next-num") return ansNum();
    if (action === "next-sel") return ansSel();
    if (action === "restart") return start();


  // ==========================
  // NEW CRUD ACTIONS
  // ==========================

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

      render(card(`

        <div class="report-header">
          
          <img src="ravenbilLogo.png" class="logoRender">

          <div class="company">
            <h2>RAVENBIL HERRERA</h2>
            <p>Research and Experimental Development in Health Sciences</p>
          </div>
        </div>
      <h2>Patient Record</h2>

      <div class="section">
        <h3>Basic Info</h3>
        <p><strong>Name:</strong> ${p.name || "-"}</p>
        <p><strong>Age:</strong> ${p.ageDays || "-"} days</p>
        <p><strong>Weight:</strong> ${p.weight || "-"} kg</p>
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
        <button data-action="edit" data-id="${p._id}">Edit</button>
        <button data-action="restart">New</button>
        <button onclick="printRecord()">Print</button>
      </div>
    `));
    }

    if (action === "edit") {
      const id = e.target.dataset.id;
      const p = await getPatient(id);

      patient = p;

      render(card(`
        <h2>Edit Patient</h2>

        <input id="name" value="${p.name || ""}" placeholder="Name">
        <input id="age" type="number" value="${p.ageDays || ""}" placeholder="Age (days)">
        <input id="weight" type="number" value="${p.weight || ""}" placeholder="Weight">

        <textarea id="note" placeholder="Doctor notes..." style="
    background:#f8fafc;
    border-left:4px solid #2563eb;
    padding:10px;
    border-radius:8px;
    margin-top:10px;
    width: 100%;
    height: 80px;
  "></textarea>
        <input id="doctorName" placeholder="Doctor Name">
        <input id="doctorSignature" placeholder="Signature (type full name)">

        <button data-action="update">Save Changes</button>
        <button data-action="records">Cancel</button>
      `));
    }

    if (action === "update") {
      const updated = {
        ...patient, // KEEP _id and _rev
        name: document.getElementById("name").value,
        ageDays: Number(document.getElementById("age").value),
        weight: Number(document.getElementById("weight").value),
        updatedAt: new Date().toISOString()
      };

      // 🔥 CRITICAL: timeline history
  const note = document.getElementById("note").value;
  const doctorName = document.getElementById("doctorName").value;
  const signature = document.getElementById("doctorSignature").value;
  const soap = buildSOAP(updated, updated.classifications || []);

  updated.history = updated.history || [];
  updated.history.push({
    date: updated.updatedAt,
    soap,
    note,
    doctor: {
      name: doctorName,
      signature: signature
    }
      });

      await savePatient(updated);
      return showPatientList();
    }

  } catch (err) {
    console.error("ACTION ERROR:", err);

    render(card(`
      <h3>Something went wrong</h3>
      <p>${err.message}</p>
      <button data-action="restart">Restart</button>
    `));
  }
});

// ==========================
// Make keys human-readable (CRITICAL)
// ==========================

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase());
}

// ==========================
// Clinical Data (auto-scan patient answers)
// ==========================
function buildClinicalData(p) {
  const ignore = ["name", "ageDays", "weight", "classifications", "_id"];

  return Object.entries(p)
    .filter(([k]) => !ignore.includes(k))
    .map(([k, v]) => {
      if (typeof v === "boolean") {
        return `<p><strong>${formatKey(k)}:</strong> ${v ? "Yes" : "No"}</p>`;
      }
      return `<p><strong>${formatKey(k)}:</strong> ${v}</p>`;
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
// ==========================
// OBJECTIVE MEASURE
// ==========================
function buildObjective(p) {
  const o = [];

  if (p.weight) o.push(`Weight: ${p.weight} kg`);
  if (p.temperature) o.push(`Temp: ${p.temperature} °C`);
  if (p.ageDays) o.push(`Age: ${p.ageDays} days`);

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
  render(card(`
    <h2>Patient Intake</h2>

    <input id="name" placeholder="Full Name">
    <input id="age" type="number" placeholder="Age (days)">
    <input id="weight" type="number" placeholder="Weight (kg)">

    ${button("Next", "next-intake", "primary")}
    ${button("Records", "records")}
  `));
}

function saveIntake() {
  patient.name = document.getElementById("name").value.trim();
  patient.ageDays = Number(document.getElementById("age").value);
  patient.weight = Number(document.getElementById("weight").value);

  if (!patient.name || !patient.ageDays || !patient.weight) {
    alert("Complete all fields");
    return;
  }

  initFlow();
}

// ==========================
// INIT FLOW
// ==========================
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

  renderQuestion(flow[step]);
}

// ==========================
// QUESTION RENDERER
// ==========================
function renderQuestion(q) {
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
  const val = document.getElementById("val").value;
  if (!val) return alert("Select a value");

  const q = flow[step];
  patient[q.id] = val;

  step++;
  next();
}



// ==========================
// PATIENT LIST (CRUD VIEW)
// ==========================
async function showPatientList() {
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

    render(card(`
      <h2>Patient Records</h2>
      ${data.map(p => `
        <div class="card">
          <strong>${p.name || "No name"}</strong><br>
          Age: ${p.ageDays || "-"} days<br>
          Weight: ${p.weight || "-"} kg

          <div class="actions">
            <button data-action="view" data-id="${p._id}">View</button>
            <button data-action="delete" data-id="${p._id}">Delete</button>
          </div>
        </div>
      `).join("")}
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

render(card(`<h2>Processing...</h2>`));
await new Promise(r => setTimeout(r, 50));

let results = patient.ageDays < 60
  ? classifyInfant?.(patient)
  : classifyChild?.(patient);

  

// SAFETY FALLBACK
if (!Array.isArray(results)) {
  console.error("Classification failed:", results);
  results = [{
    label: "No IMCI classification",
    level: "GREEN",
    action: "HOME"
  }];
}

  // normalize actions → array
  results = results.map(r => ({
    ...r,
    action: Array.isArray(r.action)
      ? r.action
      : String(r.action).split(",").map(a => a.trim())
  }));

  // prioritize severity
  results = prioritize(results);

  // SAVE
  // const record = await createPatient({
  //   ...patient,
  //   classifications: results
  // }, true);
  const soap = buildSOAP(patient, results);

  const record = await createPatient({
    ...patient,
    classifications: results,
    soap
  });
    record.history = record.history || [];
    record.history.push({
      date: new Date().toISOString(),
      soap
    });

  const doctorName = prompt("Doctor Name:");
  const signature = prompt("Type your signature:");
  record.history = record.history || [];
  record.history.push({
    date: new Date().toISOString(),
    soap,
    doctor: {
      name: doctorName,
      signature: signature
    }
  });


  await savePatient(record);

  window.currentPatient = record;
  patient = { ...record };

  render(buildResultUI(results));
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
// INIT
// ==========================
start();