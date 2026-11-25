const FIELDS = [
  ['fabric', 'Fabric'],
  ['fit', 'Fit'],
  ['pattern', 'Pattern'],
  ['sleeve_type', 'Sleeve'],
  ['neck_type', 'Neck'],
  ['gender', 'For'],
] as const;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Product details shown to shoppers — only what the admin entered, never defaults. */
export function productSpecs(product: Record<string, unknown>): { label: string; value: string }[] {
  return FIELDS.flatMap(([key, label]) => {
    const value = product[key];
    return typeof value === 'string' && value.trim() ? [{ label, value: capitalise(value.trim()) }] : [];
  });
}
