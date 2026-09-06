export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getExpiry(minutes = 5): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}