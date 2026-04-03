export function renderReport(patient, results){

return `

<div id="report">

<h2>IMCI CHILD ASSESSMENT REPORT</h2>

<p><strong>Patient ID:</strong> ${patient.uid}</p>
<p><strong>Name:</strong> ${patient.name}</p>
<p><strong>Age:</strong> ${patient.ageDays} days</p>
<p><strong>Weight:</strong> ${patient.weight} kg</p>

<hr>

<h3>Classification</h3>

${results.map(r => `
  <p>${r.label} (${r.level})</p>
`).join("")}

<hr>

<h3>Treatment</h3>

${results.map(r => `
  <p>${r.action}</p>
`).join("")}

<hr>

<div id="freeNote"></div>

<div id="qr"></div>

</div>

`;

}