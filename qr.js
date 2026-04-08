export function generateQRData(patient) {
  return btoa(JSON.stringify(patient)); // base64 encode
}

export function importQRData(data) {
  try {
    return JSON.parse(atob(data));
  } catch {
    return null;
  }
}



///show qr
if (action === "show-qr") {
  const data = generateQRData(patient);

  render(card(`
    <h3>Scan to Transfer</h3>
    <textarea>${data}</textarea>
  `));
}


///import qr
if (action === "import-qr") {
  const raw = prompt("Paste QR data");

  const patient = importQRData(raw);

  if (!patient) return alert("Invalid QR");

  await savePatient(patient);
  alert("Imported successfully");
}