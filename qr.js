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