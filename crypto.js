async function encryptData(data, password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data))
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };
}


const SECRET = "nanaycare_secret_key"; // later: user-based

export async function encrypt(data) {
  const enc = new TextEncoder().encode(JSON.stringify(data));

  const key = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SECRET));

  return btoa(String.fromCharCode(...new Uint8Array(enc)));
}

export async function decrypt(data) {
  const str = atob(data);
  return JSON.parse(str);
}

///apply encryption before saving

const encrypted = await encrypt(record);
await db.put({
  _id: record._id,
  data: encrypted
});



////apply decryption when reading

const doc = await db.get(id);
const patient = await decrypt(doc.data);