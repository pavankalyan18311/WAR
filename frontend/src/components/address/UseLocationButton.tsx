'use client';

import { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { detectAddress, LocationUnavailableError, type LocatedAddress } from '@/lib/geoClient';

const RETRY_AFTER_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * "Use my current location" — fills an address form from the device's GPS.
 * If the lookup fails it quietly retries once after 2 s; if that fails too (or location
 * is blocked) it shows no error and simply puts the cursor in the address field.
 */
export default function UseLocationButton({ onDetected, fallbackFieldId }: {
  onDetected: (address: LocatedAddress) => void;
  /** id of the input to focus when the location can't be found */
  fallbackFieldId: string;
}) {
  const [loading, setLoading] = useState(false);

  const goToAddressField = () => {
    const field = document.getElementById(fallbackFieldId);
    field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    field?.focus();
  };

  const locate = async () => {
    setLoading(true);
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          onDetected(await detectAddress());
          return;
        } catch (err) {
          if (err instanceof LocationUnavailableError || attempt === 2) throw err;
          await sleep(RETRY_AFTER_MS);
        }
      }
    } catch {
      goToAddressField();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={locate} disabled={loading}
      className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl border-2 border-dashed px-4 py-2.5 transition-colors hover:bg-[var(--brand-soft)] disabled:opacity-60 disabled:cursor-wait"
      style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
      <LocateFixed size={16} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Detecting…' : 'Use my current location'}
    </button>
  );
}
