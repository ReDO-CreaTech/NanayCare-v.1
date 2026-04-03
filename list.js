window.getAllPatients = async function () {
  return await db.patients.orderBy("createdAt").reverse().toArray();
};

window.getPatientById = async function (id) {
  return await db.patients.get(id);
};

window.deletePatient = async function (id) {
  return await db.patients.delete(id);
};