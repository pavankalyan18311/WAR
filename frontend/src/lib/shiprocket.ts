/**
 * Shiprocket Logistics & Shipping Integration Library
 * Supports both Production API and Dev Sandbox / Mock mode seamlessly.
 */

export interface ServiceabilityResponse {
  success: boolean;
  serviceable: boolean;
  courier_name?: string;
  courier_company_id?: number;
  estimated_delivery_days?: string;
  rate?: number;
  cod_charges?: number;
  error?: string;
}

export interface CreateShipmentPayload {
  order_id: string;
  order_date: string;
  pickup_location?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  }>;
  payment_method: 'Prepaid' | 'COD';
  sub_total: number;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
}

export interface ShiprocketOrderResult {
  success: boolean;
  shipment_id?: number;
  order_id?: number;
  awb_code?: string;
  courier_name?: string;
  label_url?: string;
  error?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtain Bearer Token from Shiprocket API (or Dev Sandbox token)
 */
export async function getShiprocketToken(): Promise<string | null> {
  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.SHIPROCKET_SANDBOX === 'true';
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    if (isDevMode) {
      console.log('[Shiprocket Dev] Using local dev sandbox mode (no Shiprocket credentials provided)');
      return 'DEV_SANDBOX_TOKEN';
    }
    console.warn('[Shiprocket] Missing SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD environment variables.');
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[Shiprocket Auth Error]:', errData);
      if (isDevMode) return 'DEV_SANDBOX_TOKEN';
      return null;
    }

    const data = await res.json();
    if (data.token) {
      // Shiprocket tokens last 10 days; cache for 9 days
      cachedToken = {
        token: data.token,
        expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000,
      };
      return data.token;
    }
  } catch (err) {
    console.error('[Shiprocket Auth Exception]:', err);
  }

  if (isDevMode) return 'DEV_SANDBOX_TOKEN';
  return null;
}

/**
 * Check Courier Serviceability for a Pincode
 */
export async function checkPincodeServiceability(
  deliveryPincode: string,
  cod: boolean = false,
  weight: number = 0.5
): Promise<ServiceabilityResponse> {
  const cleanPincode = deliveryPincode.replace(/\D/g, '').slice(0, 6);
  if (cleanPincode.length !== 6) {
    return { success: false, serviceable: false, error: 'Please enter a valid 6-digit Indian pincode' };
  }

  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.SHIPROCKET_SANDBOX === 'true';
  const token = await getShiprocketToken();

  if (!token || token === 'DEV_SANDBOX_TOKEN') {
    // Sandbox / Dev Mode Intelligent Pincode Lookup
    const prefix = cleanPincode.slice(0, 2);
    const metroPrefixes = ['11', '40', '56', '60', '70', '50', '38', '41'];
    const isMetro = metroPrefixes.includes(prefix);

    return {
      success: true,
      serviceable: true,
      courier_name: isMetro ? 'BlueDart Express (Air)' : 'Delhivery Surface',
      courier_company_id: isMetro ? 1 : 2,
      estimated_delivery_days: isMetro ? '2–3 business days' : '4–6 business days',
      rate: isMetro ? 49 : 69,
      cod_charges: cod ? 30 : 0,
    };
  }

  try {
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || '560057';
    const query = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: cleanPincode,
      weight: String(weight),
      cod: cod ? '1' : '0',
    });

    const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/serviceability?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, serviceable: false, error: errData.message || 'Pincode check failed' };
    }

    const data = await res.json();
    const recommended = data.data?.available_courier_companies?.[0];

    if (!recommended) {
      return { success: true, serviceable: false, error: 'Pincode is currently unserviceable for delivery' };
    }

    return {
      success: true,
      serviceable: true,
      courier_name: recommended.courier_name,
      courier_company_id: recommended.courier_company_id,
      estimated_delivery_days: `${recommended.etd || '3-5'} business days`,
      rate: Number(recommended.rate || 49),
      cod_charges: Number(recommended.cod_charges || 0),
    };
  } catch (err: any) {
    console.error('[Shiprocket Serviceability Exception]:', err);
    if (isDevMode) {
      return {
        success: true,
        serviceable: true,
        courier_name: 'Delhivery Express',
        estimated_delivery_days: '3–4 business days',
        rate: 49,
      };
    }
    return { success: false, serviceable: false, error: err.message || 'Serviceability check error' };
  }
}

/**
 * Create Order in Shiprocket Logistics Engine & Obtain AWB / Tracking Code
 */
export async function createShiprocketOrder(payload: CreateShipmentPayload): Promise<ShiprocketOrderResult> {
  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.SHIPROCKET_SANDBOX === 'true';
  const token = await getShiprocketToken();

  if (!token || token === 'DEV_SANDBOX_TOKEN') {
    // Sandbox / Dev Mode Mock Order Creation
    const mockAwb = `SRK-DEV-${Math.floor(100000000 + Math.random() * 900000000)}`;
    console.log('[Shiprocket Dev Sandbox] Created Mock Order & AWB:', mockAwb, 'for order:', payload.order_id);
    return {
      success: true,
      shipment_id: Math.floor(100000 + Math.random() * 900000),
      order_id: Math.floor(100000 + Math.random() * 900000),
      awb_code: mockAwb,
      courier_name: payload.payment_method === 'COD' ? 'Delhivery Surface' : 'BlueDart Air',
    };
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.order_id) {
      console.error('[Shiprocket Create Order Error]:', data);
      return { success: false, error: data.message || 'Shiprocket order creation failed' };
    }

    return {
      success: true,
      shipment_id: data.shipment_id,
      order_id: data.order_id,
      awb_code: data.awb_code || `AWB-${data.shipment_id}`,
      courier_name: data.courier_name || 'Shiprocket Partner',
    };
  } catch (err: any) {
    console.error('[Shiprocket Create Order Exception]:', err);
    if (isDevMode) {
      return {
        success: true,
        awb_code: `SRK-DEV-${Math.floor(100000000 + Math.random() * 900000000)}`,
        courier_name: 'Delhivery Express',
      };
    }
    return { success: false, error: err.message || 'Shiprocket API error' };
  }
}
