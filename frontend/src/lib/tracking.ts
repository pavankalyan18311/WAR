/** Works out what the customer typed into "Track order": our order reference, an order id, or a courier AWB. */
export function trackingQuery(input: string): { param: 'ref' | 'order_id' | 'awb'; value: string } | null {
  const clean = input.trim();
  if (!clean) return null;
  if (/^WAR-/i.test(clean)) return { param: 'ref', value: clean.toUpperCase() };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) return { param: 'order_id', value: clean };
  return { param: 'awb', value: clean.replace(/\s+/g, '') };
}
