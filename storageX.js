

// ==========================
// CREATE / UPDATE PATIENT
// ==========================
async function createPatient(data, generateId = true) {
  return {
    _id: generateId ? "p_" + Date.now() : data._id,
    type: "patient",
    createdAt: new Date().toISOString(),
    ...data
  };
}

async function savePatient(record) {
  try {
    const existing = await db.get(record._id).catch(() => null);

    if (existing) {
      record._rev = existing._rev; // update
    }

    await db.put(record);
    return record;

  } catch (err) {
    console.error("Save error:", err);
    throw err;
  }
}

// ==========================
// READ ALL
// ==========================
async function getAllPatients() {
  const res = await db.allDocs({
    include_docs: true
  });

  return res.rows.map(r => r.doc);
}

// ==========================
// READ ONE
// ==========================
async function getPatient(id) {
  try {
    return await db.get(id);
  } catch {
    return null;
  }
}

// ==========================
// DELETE
// ==========================
async function deletePatient(id) {
  const doc = await db.get(id);
  await db.remove(doc);
}

// ==========================
// UPDATE (PARTIAL)
// ==========================
async function updatePatient(id, updates) {
  const doc = await db.get(id);
  const updated = { ...doc, ...updates };
  await db.put(updated);
  return updated;
}