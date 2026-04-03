window.savePatient = async function (patient) {
  patient.updatedAt = Date.now();
  await db.patients.put(patient);
  return patient;
};