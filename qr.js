window.exportPatientQR = function (patient) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(patient))));
};

window.importPatientQR = async function (qrString) {
  try {
    const json = decodeURIComponent(escape(atob(qrString)));
    const patient = JSON.parse(json);

    patient.source = "qr_import";

    await savePatient(patient);

    return patient;
  } catch (e) {
    alert("Invalid QR data");
  }
};