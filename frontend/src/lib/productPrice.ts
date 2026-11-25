/** What to show in a price block: MRP/saving only when MRP is genuinely higher. */
export function priceDisplay(p: { price: number; compare_at_price?: number | null }) {
  const mrp = p.compare_at_price && p.compare_at_price > p.price ? p.compare_at_price : null;
  const saving = mrp ? mrp - p.price : 0;
  return { price: p.price, mrp, saving, percent: mrp ? Math.round((saving / mrp) * 100) : 0 };
}
