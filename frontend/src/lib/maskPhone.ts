/** Phone for printed labels: first two and last two digits only, e.g. 98XXXXXX10. */
export function maskPhone(phone?: string | null): string {
  const digits = String(phone ?? '').replace(/\D/g, '').slice(-10);
  if (digits.length <= 4) return 'X'.repeat(digits.length);
  return digits.slice(0, 2) + 'X'.repeat(digits.length - 4) + digits.slice(-2);
}
