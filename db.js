function savePatient(p) {
  let req = indexedDB.open("IMCI_DB", 1);

  req.onupgradeneeded = () => {
    req.result.createObjectStore("patients", { keyPath: "id" });
  };

  req.onsuccess = () => {
    let db = req.result;
    let tx = db.transaction("patients", "readwrite");
    tx.objectStore("patients").add(p);
  };
}



const db = new Dexie("IMCI_DB");

db.version(1).stores({
  patients: "id, createdAt, updatedAt, source"
});

window.db = db;



