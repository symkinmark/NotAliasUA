/** Milliseconds to add to this device's clock to match the room server's. */
let offset = 0;
let bestRoundTrip = Infinity;

/** Server time — phones in a room count the round down from the same deadline. */
export function serverNow(): number {
  return Date.now() + offset;
}

/** Calibrates against a server timestamp, trusting the quickest round trip seen so far. */
export function calibrate(serverTime: number, sentAt: number, receivedAt: number) {
  const roundTrip = receivedAt - sentAt;
  if (roundTrip > bestRoundTrip) return;
  bestRoundTrip = roundTrip;
  offset = serverTime - (sentAt + receivedAt) / 2;
}
