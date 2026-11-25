import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UseLocationButton from '@/components/address/UseLocationButton';
import { fetchPincodeInfo } from '@/lib/geoClient';

const fetchMock = vi.fn();
let geo: any;
const address = { line1: '12, 100 Feet Road', area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' };
const busy = { ok: false, json: async () => ({ error: 'busy' }) };
const found = { ok: true, json: async () => address };

function renderWithField(onDetected = vi.fn()) {
  render(<>
    <UseLocationButton onDetected={onDetected} fallbackFieldId="street" />
    <input id="street" aria-label="Street" />
  </>);
  return onDetected;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  geo = { getCurrentPosition: vi.fn((ok: any) => ok({ coords: { latitude: 12.97, longitude: 77.64 } })) };
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('UseLocationButton', () => {
  it('fills the address from the device location', async () => {
    fetchMock.mockResolvedValue(found);
    const onDetected = renderWithField();
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));
    await waitFor(() => expect(onDetected).toHaveBeenCalledWith(address));
    expect(fetchMock).toHaveBeenCalledWith('/api/geo/reverse?lat=12.97&lon=77.64');
  });

  it('keeps loading and retries once after 2 seconds when the lookup is busy', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(busy).mockResolvedValueOnce(found);
    const onDetected = renderWithField();
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole('button')).toHaveTextContent(/detecting/i);
    expect(onDetected).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(onDetected).toHaveBeenCalledWith(address);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('if it still fails, shows no error — just takes the customer to the address field', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(busy);
    const onDetected = renderWithField();
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });

    expect(onDetected).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Street'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent(/use my current location/i);
  });

  it('blocked location permission: no message, no retry — straight to the address field', async () => {
    geo.getCurrentPosition = vi.fn((_ok: any, fail: any) => fail({ code: 1 }));
    renderWithField();
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Street')));
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('fetchPincodeInfo', () => {
  it('asks our server and returns city/state, or null', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ city: 'Pune', state: 'Maharashtra' }) });
    expect(await fetchPincodeInfo('411001')).toEqual({ city: 'Pune', state: 'Maharashtra' });
    expect(fetchMock).toHaveBeenCalledWith('/api/geo/pincode?pin=411001');
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    expect(await fetchPincodeInfo('999999')).toBeNull();
    expect(await fetchPincodeInfo('12')).toBeNull();
  });
});
