const KEY = "deviceId";

/**
 * Identifies this tab in a room, so the room knows whose phone is explaining.
 * Per tab rather than per browser, so two tabs on one laptop act as two phones.
 * Math.random rather than crypto.randomUUID, which is missing on plain-http LAN dev.
 */
function load(): string {
  const fresh = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    sessionStorage.setItem(KEY, fresh);
  } catch {
    // Private mode can refuse storage; an id for this page load is still fine.
  }
  return fresh;
}

export const deviceId = load();
