import { CheckoutError } from './priceOrder';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/** Cleans and validates a delivery address sent by the browser. */
export function validateShippingAddress(raw: any): ShippingAddress {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const address: ShippingAddress = {
    full_name: s(raw?.full_name),
    phone: s(raw?.phone).replace(/\D/g, '').slice(-10),
    address_line_1: s(raw?.address_line_1),
    address_line_2: s(raw?.address_line_2),
    city: s(raw?.city),
    state: s(raw?.state),
    pincode: s(raw?.pincode),
    country: s(raw?.country) || 'India',
  };

  if (!address.full_name || !address.address_line_1 || !address.city || !address.state) {
    throw new CheckoutError('Please fill in your full delivery address.');
  }
  if (!/^[6-9]\d{9}$/.test(address.phone)) throw new CheckoutError('Please enter a valid 10-digit mobile number.');
  if (!/^\d{6}$/.test(address.pincode)) throw new CheckoutError('Please enter a valid 6-digit pincode.');
  return address;
}
