/** Product details that use an admin-managed dropdown (with an "Other…" option). */
export const PRODUCT_ATTRIBUTES = [
  { key: 'fabric', label: 'Fabric' },
  { key: 'fit', label: 'Fit' },
  { key: 'pattern', label: 'Pattern' },
  { key: 'sleeve_type', label: 'Sleeve' },
  { key: 'neck_type', label: 'Neck' },
  { key: 'gender', label: 'For' },
] as const;

export type ProductAttribute = (typeof PRODUCT_ATTRIBUTES)[number]['key'];
export type AttributeOption = { id: string; value: string };
export type OptionsByAttribute = Record<ProductAttribute, AttributeOption[]>;

export const isProductAttribute = (v: unknown): v is ProductAttribute =>
  PRODUCT_ATTRIBUTES.some((a) => a.key === v);

/** Tidies a typed value so "  bamboo   cotton " and "Bamboo Cotton" don't become two options. */
export function tidyOption(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)(\p{Ll})/gu, (_, space: string, ch: string) => space + ch.toUpperCase());
}

export const emptyOptions = (): OptionsByAttribute =>
  Object.fromEntries(PRODUCT_ATTRIBUTES.map((a) => [a.key, []])) as unknown as OptionsByAttribute;
