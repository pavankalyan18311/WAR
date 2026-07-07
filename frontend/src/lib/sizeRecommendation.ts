// ─── Size Recommendation Engine ────────────────────────────────────────────
// Pure logic — no AI. Based on chest, shoulder, height, weight, and fit preference.

export type SizeCode = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
export type FitPreference = 'slim' | 'regular' | 'relaxed' | 'oversized';

export interface Measurements {
  height: number;       // cm
  weight: number;       // kg
  chest: number;        // cm (circumference)
  shoulder: number;     // cm (across back, point to point)
  fit: FitPreference;
}

export interface SizeResult {
  recommended: SizeCode;
  alternates: SizeCode[];
  confidence: 'perfect' | 'good' | 'borderline';
  fitNote: string;
  measurements: {
    size: SizeCode;
    chest: string;
    shoulder: string;
    length: string;
  };
}

// ─── Size chart (chest cm range, shoulder cm range) ──────────────────────────
interface SizeSpec {
  chest: [number, number];      // min, max cm (body measurement)
  shoulder: [number, number];
  garmentLength: string;        // finished garment length
}

const SIZE_SPECS: Record<SizeCode, SizeSpec> = {
  XS:  { chest: [78, 84],   shoulder: [38, 40],  garmentLength: '67 cm' },
  S:   { chest: [84, 90],   shoulder: [40, 42],  garmentLength: '69 cm' },
  M:   { chest: [90, 97],   shoulder: [42, 44],  garmentLength: '71 cm' },
  L:   { chest: [97, 104],  shoulder: [44, 46],  garmentLength: '73 cm' },
  XL:  { chest: [104, 112], shoulder: [46, 48],  garmentLength: '75 cm' },
  XXL: { chest: [112, 120], shoulder: [48, 51],  garmentLength: '77 cm' },
  '3XL': { chest: [120, 130], shoulder: [51, 54], garmentLength: '79 cm' },
};

const SIZE_ORDER: SizeCode[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

// Fit adjustments: how many sizes to shift up/down
const FIT_SHIFT: Record<FitPreference, number> = {
  slim: -1,
  regular: 0,
  relaxed: 1,
  oversized: 2,
};

const FIT_NOTES: Record<FitPreference, string> = {
  slim:     'Slim fit hugs the body closely. If between sizes, go up one.',
  regular:  'Regular fit sits comfortably — not too tight, not too loose.',
  relaxed:  'Relaxed fit gives extra room through the chest and waist.',
  oversized: 'Oversized fit is intentionally 2 sizes up for that streetwear drop.',
};

function clampSize(index: number): SizeCode {
  return SIZE_ORDER[Math.max(0, Math.min(SIZE_ORDER.length - 1, index))];
}

function getBaseSize(chest: number, shoulder: number): { index: number; confidence: SizeResult['confidence'] } {
  // Score each size by how well chest + shoulder fit
  let bestIndex = 3; // default M
  let bestScore = Infinity;
  let confidence: SizeResult['confidence'] = 'good';

  SIZE_ORDER.forEach((size, i) => {
    const spec = SIZE_SPECS[size];
    const chestMid = (spec.chest[0] + spec.chest[1]) / 2;
    const shoulderMid = (spec.shoulder[0] + spec.shoulder[1]) / 2;
    // Weight chest more heavily (2x) than shoulder
    const score = Math.abs(chest - chestMid) * 2 + Math.abs(shoulder - shoulderMid);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  });

  // Determine confidence based on how close the measurement is to the size range
  const spec = SIZE_SPECS[SIZE_ORDER[bestIndex]];
  const chestInRange = chest >= spec.chest[0] && chest <= spec.chest[1];
  const shoulderInRange = shoulder >= spec.shoulder[0] && shoulder <= spec.shoulder[1];

  if (chestInRange && shoulderInRange) confidence = 'perfect';
  else if (chestInRange || shoulderInRange) confidence = 'good';
  else confidence = 'borderline';

  return { index: bestIndex, confidence };
}

export function recommendSize(m: Measurements): SizeResult {
  const { index: baseIndex, confidence } = getBaseSize(m.chest, m.shoulder);
  const shift = FIT_SHIFT[m.fit];
  const finalIndex = Math.max(0, Math.min(SIZE_ORDER.length - 1, baseIndex + shift));
  const recommended = SIZE_ORDER[finalIndex];

  // Alternates: one size up and one down from the recommended (not base)
  const alternates: SizeCode[] = [];
  if (finalIndex > 0) alternates.push(clampSize(finalIndex - 1));
  if (finalIndex < SIZE_ORDER.length - 1) alternates.push(clampSize(finalIndex + 1));

  const spec = SIZE_SPECS[recommended];

  return {
    recommended,
    alternates,
    confidence,
    fitNote: FIT_NOTES[m.fit],
    measurements: {
      size: recommended,
      chest: `${spec.chest[0]}–${spec.chest[1]} cm`,
      shoulder: `${spec.shoulder[0]}–${spec.shoulder[1]} cm`,
      length: spec.garmentLength,
    },
  };
}
