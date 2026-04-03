window.renderPatientList = async function (containerId = "records") {
  const el = document.getElementById(containerId);
  if (!el) return;

  const patients = await getAllPatients();

  if (!patients.length) {
    el.innerHTML = "<p>No records yet</p>";
    return;
  }

  el.innerHTML = patients.map(p => `
    <div class="card">
      <strong>${p.name || "Unnamed"}</strong><br>
      Age: ${p.ageDays} days<br>
      Weight: ${p.weight} kg<br>

      <button onclick="viewPatient('${p.id}')">View</button>
      <button onclick="removePatient('${p.id}')">Delete</button>
    </div>
  `).join("");
};

window.removePatient = async function(id) {
  await deletePatient(id);
  renderPatientList();
};