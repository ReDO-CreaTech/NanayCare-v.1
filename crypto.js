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