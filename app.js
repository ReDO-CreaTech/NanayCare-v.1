document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});




// SAFETY FALLBACKS
if (typeof window.__ === "undefined") {
  window.__ = function (key) { return key; };
}

let patient = { id: Date.now() };
let step = 0;
let flow = [];
let lang = "en";

const screen = document.getElementById("screen");
if (!screen) console.error("Screen element not found");

// START
function start() {
  step = 0;
  patient = { id: Date.now() };
  intake();
}

// INTAKE UI
function intake() {
  screen.innerHTML = `
    <div class="card">
      <input id="name" placeholder="${__("name")}">
      <input id="age" type="number" placeholder="${__("age")}">
      <input id="weight" type="number" placeholder="${__("weight")}">
      <input id="height" type="number" placeholder="${__("height")}">

      <button onclick="saveIntake()">${__("next")}</button>
      <button onclick="showPatientList()">   Records</button>
    </div>
  `;
}

window.showPatientList = async function () {
  const patients = await getAllPatients();

  if (!patients.length) {
    screen.innerHTML = `
      <div class="card">
        <h2>No Records</h2>
        <button onclick="start()">New Patient</button>
      </div>
    `;
    return;
  }

  screen.innerHTML = `
    <div class="card">
      <h2>Patient Records</h2>

      ${patients.map(p => `
        <div class="patient-item" onclick="viewPatient('${p.id}')">
          <strong>${p.name || "Unnamed"}</strong><br>
          Age: ${p.ageDays} days<br>
          Weight: ${p.weight} kg
        </div>
      `).join("")}

      <button onclick="start()">New Patient</button>
    </div>
  `;
};

window.viewPatient = async function (id) {
  const p = await getPatientById(id);

  if (!p) {
    alert("Patient not found");
    return;
  }

  window.currentPatient = p;

  screen.innerHTML = `
    <div class="card">
      <h2>Patient Details</h2>

      <p><strong>Name:</strong> ${p.name || "-"}</p>
      <p><strong>Age:</strong> ${p.ageDays} days</p>
      <p><strong>Weight:</strong> ${p.weight} kg</p>

      <h3>Classifications</h3>
      ${(p.classifications || []).map(c => `
        <div class="${c.level.toLowerCase()}">
          ${c.label} (${c.level})
        </div>
      `).join("")}

      <h3>Treatments</h3>
      ${(p.treatments || []).map(t => `<div>${t}</div>`).join("")}

      <button onclick="editPatient('${p.id}')">Edit</button>
      <button onclick="confirmDelete('${p.id}')">Delete</button>
      <button onclick="showQR()">Share (QR)</button>
      <button onclick="showPatientList()">Back</button>

      <div id="qr"></div>
    </div>
  `;
};

// KEEP ONLY ONE VERSION
window.editPatient = async function (id) {
  const p = await getPatientById(id);

  if (!p) return alert("Patient not found");

  screen.innerHTML = `
    <div class="card">
      <h2>Edit Patient</h2>

      <input id="editName" value="${p.name || ""}">
      <input id="editWeight" type="number" value="${p.weight || ""}">

      <button onclick="saveEdit('${id}')">Save</button>
      <button onclick="viewPatient('${id}')">Cancel</button>
    </div>
  `;
};

window.confirmDelete = async function (id) {
  if (!confirm("Delete this patient permanently?")) return;

  await deletePatient(id);
  showPatientList();
};

// SAVE INTAKE
function saveIntake() {
  let age = document.getElementById("age").value;
  let weight = document.getElementById("weight").value;

  if (age === "") return alert("Age is required");
  if (weight === "") return alert("Weight is required for treatment dosing");

  patient.name = document.getElementById("name").value;
  patient.ageDays = Number(age);
  patient.ageMonths = Math.floor(patient.ageDays / 30);
  patient.weight = Number(weight);
  patient.height = Number(document.getElementById("height").value) || null;

  flow = patient.ageDays < 60 ? infantFlow : childFlow;

  next();
}

// NEXT QUESTION
function next() {
  while (step < flow.length) {
    let q = flow[step];
    if (q.when && !q.when(patient)) {
      step++;
      continue;
    }
    break;
  }

  if (step >= flow.length) return result();

  let q = flow[step];

  if (q.type === "boolean") {
    screen.innerHTML = `
      <div class="card">
        <h2>${q.label[lang] || q.label.en}</h2>
        <button onclick="ans(true)">${__("yes")}</button>
        <button onclick="ans(false)">${__("no")}</button>
      </div>
    `;
  }

  if (q.type === "number") {
    screen.innerHTML = `
      <div class="card">
        <h2>${q.label[lang] || q.label.en}</h2>
        <input id="val" type="number">
        <button onclick="ansNum()">${__("next")}</button>
      </div>
    `;
  }

  if (q.type === "select") {
    screen.innerHTML = `
      <div class="card">
        <h2>${q.label?.[lang] || q.label?.en || q.label}</h2>
        <select id="val">
          ${q.options.map(o => `
            <option value="${o.value}">
              ${typeof o.label === "string"
                ? o.label
                : (o.label?.[lang] || o.label?.en)}
            </option>
          `).join("")}
        </select>
        <button onclick="ansSel()">${__("next")}</button>
      </div>
    `;
  }

  if (q.type === "breathingTool") {
  return openBreathingTool();
}

}

// BOOLEAN ANSWER
function ans(v) {
  patient[flow[step].id] = v;

  if (patient.ageDays < 60) {
    if (
      patient.unableToDrink ||
      patient.convulsions ||
      patient.lethargic ||
      (patient.temperature && patient.temperature >= 37.5) ||
      (patient.temperature && patient.temperature < 35.5) ||
      (patient.respiratoryRate && patient.respiratoryRate >= 60) ||
      patient.severeChestIndrawing
    ) {
      step = flow.length;
      return next();
    }
  }

  step++;
  next();
}

// NUMBER ANSWER
function ansNum() {
  let val = document.getElementById("val").value;
  if (val === "") return alert("Please enter a value");

  let q = flow[step];
  patient[q.id] = Number(val);

  if (q.id === "temperature") {
    patient.fever = patient.temperature >= 37.5;
    patient.lowTemp = patient.temperature < 35.5;
  }

  step++;
  next();
}

// SELECT ANSWER
function ansSel() {
  patient[flow[step].id] = document.getElementById("val").value;
  step++;
  next();
}



function getAgeGroup(ageDays) {
  if (ageDays < 60) return "YOUNG_INFANT";   // <2 months
  if (ageDays < 365) return "INFANT";        // 2–11 months
  return "CHILD";                            // 1–5 years
}

/* =========================
   WHO BREATHING CLASSIFIER
========================= */
function classifyBreathingWHO(ageDays, rate) {
  if (rate === undefined || rate === null) return null;

  const group = getAgeGroup(ageDays);

  if (group === "YOUNG_INFANT") {
    if (rate >= 60) return "SEVERE_PNEUMONIA";
    return "NORMAL";
  }

  if (group === "INFANT") {
    if (rate >= 50) return "SEVERE_PNEUMONIA";
    return "NORMAL";
  }

  if (group === "CHILD") {
    if (rate >= 40) return "SEVERE_PNEUMONIA";
    return "NORMAL";
  }

  return null;
}


// RESULT (FULL ORIGINAL LOGIC PRESERVED)
async function result() {

  const breathClass = classifyBreathingWHO(
    patient.ageDays,
    patient.respiratoryRate
  );

  let results = patient.ageDays < 60
    ? classifyInfant(patient)
    : classifyChild(patient);

  // =========================
  // BREATHING OVERRIDE (WHO)
  // =========================
  if (!results || results.length === 0) {
    results = [{
      label: "No IMCI danger signs detected",
      level: "GREEN",
      action: "home_care"
    }];
  }

  // 👇 STEP 2: BREATHING OVERRIDE (AFTER SAFETY FIX)
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

  const record = createPatient({
    ...patient,
    symptoms: { ...patient },
    respiratoryRate: patient.respiratoryRate,
    breathingClassification: breathClass,
    classifications: results,
    treatments: results.map(r => r.action)
  });

  await savePatient(record);

  window.currentPatient = record;

  if (!results.length) {
    return screen.innerHTML = `
      <div class="card">
        <p><strong>Age:</strong> ${patient.ageDays} days</p>
        <p><strong>Weight:</strong> ${patient.weight} kg</p>
        <p><strong>Respiratory Rate:</strong> ${patient.respiratoryRate || "Not recorded"} breaths/min</p>
        <p>No results available</p>
        <button onclick="location.reload()">New</button>
        <button onclick="showQR()">Share (QR)</button>
        <div id="qr"></div>
      </div>
    `;
  }





  
  const currentLang = typeof lang !== "undefined" ? lang : "en";

  const uniqueResults = [];
  const seen = new Set();

  results.forEach(r => {
    const key = r.label + r.action;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  });

  const hasRed = uniqueResults.some(r => r.level === "RED");

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

  const mapLinkHTML = `
    <div class="card">
      <button onclick="goToMap()">Check Nearest Hospital</button>
    </div>
  `;

  screen.innerHTML = `
    <div class="card">
      <h2>Assessment Result</h2>

      <p><strong>Age:</strong> ${patient.ageDays} days</p>
      <p><strong>Weight:</strong> ${patient.weight} kg</p>

      ${treatmentHTML}
      ${counselingHTML}
      ${mapLinkHTML}

      <button onclick="location.reload()">New</button>
    </div>
  `;
}




// ======================
// BREATHING RATE TOOL
// ======================

let breathCount = 0;
let breathTimer = null;
let breathSeconds = 30;
let breathRunning = false;
let breathResult = null;

function openBreathingTool() {
  breathCount = 0;
  breathSeconds = 30;
  breathRunning = false;

  screen.innerHTML = `
    <div class="card">
      <h2>Breathing Rate Test</h2>

      <p id="breathStatus">Press start and count each breath</p>

      <h1 id="breathCount">0</h1>

      <button onclick="startBreathing()">Start</button>
      <button onclick="tapBreath()" id="tapBtn" disabled>Tap Breath</button>
      <button onclick="stopBreathing()" id="stopBtn" disabled>Stop</button>

      <div id="breathResult"></div>
    </div>
  `;
}

window.openBreathingTool = openBreathingTool;

// START
function startBreathing() {
  breathCount = 0;
  breathSeconds = 30;
  breathRunning = true;

  document.getElementById("tapBtn").disabled = false;
  document.getElementById("stopBtn").disabled = false;

  document.getElementById("breathStatus").innerText = "Counting... (30 sec)";

  breathTimer = setInterval(() => {
    breathSeconds--;

    if (breathSeconds <= 0) {
      stopBreathing(true);
    }
  }, 1000);
}

window.startBreathing = startBreathing;

// TAP BREATH
function tapBreath() {
  if (!breathRunning) return;

  breathCount++;
  document.getElementById("breathCount").innerText = breathCount;
}

window.tapBreath = tapBreath;

// STOP + CALCULATE
function stopBreathing(auto = false) {
  breathRunning = false;

  clearInterval(breathTimer);

  document.getElementById("tapBtn").disabled = true;
  document.getElementById("stopBtn").disabled = true;

  const breathsPerMinute = Math.round((breathCount / 30) * 60);

  breathResult = breathsPerMinute;

  // store in patient if exists
  if (window.currentPatient) {
    window.currentPatient.respiratoryRate = breathsPerMinute;
  }

  document.getElementById("breathResult").innerHTML = `
    <h3>Result</h3>
    <p><strong>${breathsPerMinute} breaths/min</strong></p>

    ${getBreathingInterpretation(breathsPerMinute)}

    <button onclick="startBreathing()">Read Again</button>
    <button onclick="openBreathingTool()">Reset</button>
  `;

  document.getElementById("breathStatus").innerText =
    auto ? "Finished automatically" : "Stopped";
}

window.stopBreathing = stopBreathing;

// INTERPRETATION (IMCI STYLE)
function getBreathingInterpretation(rate) {
  let level = "";

  if (rate >= 60) {
    level = "🔴 Severe fast breathing (danger)";
  } else if (rate >= 50) {
    level = "🟠 Fast breathing";
  } else if (rate >= 40) {
    level = "🟡 Mildly elevated";
  } else {
    level = "🟢 Normal range";
  }


  if (window.flow && window.step !== undefined) {
  patient.respiratoryRate = breathsPerMinute;

  // return to questionnaire
  window.step++;
  setTimeout(() => next(), 500);
}

  return `<p>${level}</p>`;
}










function goToMap() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // pass location to next page
      window.location.href = `map.html?lat=${lat}&lng=${lng}`;
    },
    () => {
      alert("Location access denied");
      window.location.href = "map.html";
    }
  );
}

function goToMapDirect() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      window.location.href = `map.html?lat=${lat}&lng=${lng}`;
    },
    () => {
      // fallback if user denies location
      window.location.href = "map.html";
    }
  );
}

function setupFabHint() {
  const fab = document.querySelector(".fab");
  if (!fab) return;

  // detect mobile
  const isMobile = window.innerWidth < 768;

  if (!isMobile) return;

  // show every 5 seconds
  setInterval(() => {
    fab.classList.add("show-label");

    setTimeout(() => {
      fab.classList.remove("show-label");
    }, 2000); // visible for 2 sec

  }, 5000);
}

window.saveIntake = saveIntake;
window.ans = ans;
window.ansNum = ansNum;
window.ansSel = ansSel;
window.goToMap = goToMap;
window.goToMapDirect = goToMapDirect;


// run after load
window.addEventListener("load", setupFabHint);

window.showQR = function() {
  const container = document.getElementById("qr");
  if (!container) return alert("QR container missing");

  container.innerHTML = ""; // clear previous

  const qrData = exportPatientQR(window.currentPatient);

  new QRCode(container, {
    text: qrData,
    width: 200,
    height: 200
  });
};

start();
