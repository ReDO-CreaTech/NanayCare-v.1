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