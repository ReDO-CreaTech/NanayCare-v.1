window.createPatient = function (data = {}) {
  return {
    id: data.id || `p_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,

    name: data.name || "",
    ageDays: data.ageDays || null,
    weight: data.weight || null,
    height: data.height || null,

    symptoms: data.symptoms || {},

    classifications: data.classifications || [],
    treatments: data.treatments || [],

    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),
    location: data.location || null,
    source: data.source || "app",

    version: 1
  };
};