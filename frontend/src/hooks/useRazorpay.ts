'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadRazorpayScript, type RazorpayOptions, type RazorpaySuccessResponse } from '@/lib/razorpay';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseRazorpayOptions {
  couponCode?: string;
  notes?: string;
  deliveryAddress: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  onSuccess?: (orderNumber: string, orderId: string) => void;
  onFailure?: (error: string) => void;
  onDismiss?: () => void;
}

interface UseRazorpayReturn {
  initiatePayment: () => Promise<void>;
  loading: boolean;
  error: string | null;
  scriptReady: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * `useRazorpay` — production-ready hook for the Razorpay payment flow.
 *
 * Flow:
 *  1. Loads Razorpay checkout.js script on mount
 *  2. On `initiatePayment()`:
 *     a. Calls backend `POST /api/payments/create-order` (amount calculated server-side)
 *     b. Opens native Razorpay checkout popup
 *     c. On success: sends payment IDs to `POST /api/payments/verify`
 *     d. On verification success: calls `onSuccess(orderNumber, orderId)`
 */
export function useRazorpay({
  couponCode,
  notes,
  deliveryAddress,
  onSuccess,
  onFailure,
  onDismiss,
}: UseRazorpayOptions): UseRazorpayReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const rzpInstanceRef = useRef<ReturnType<typeof window.Razorpay> | null>(null);

  // Pre-load the Razorpay script as early as possible
  useEffect(() => {
    loadRazorpayScript()
      .then(() => setScriptReady(true))
      .catch((err) => {
        console.error('Razorpay script load failed:', err);
        setError('Could not load payment gateway. Please check your internet connection.');
      });
  }, []);

  const initiatePayment = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // ── Step 1: Ensure script is loaded ───────────────────────────────
      if (!window.Razorpay) {
        await loadRazorpayScript();
      }

      // ── Step 2: Create Razorpay order on the backend ──────────────────
      const { data: orderData } = await api.post('/payments/create-order', {
        coupon_code: couponCode || null,
        notes: notes || null,
      });

      // ── Step 3: Build Razorpay options ────────────────────────────────
      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency ?? 'INR',
        name: 'WAR Brand',
        description: 'Premium Oversized T-Shirts',
        image: '/images/War_Logo.png',
        order_id: orderData.razorpay_order_id,
        prefill: orderData.prefill,
        theme: {
          color: '#0B0B0B',
          hide_topbar: false,
        },
        modal: {
          escape: true,
          confirm_close: true,
          ondismiss: () => {
            setLoading(false);
            onDismiss?.();
          },
        },

        // ── Step 4: Handle payment success ─────────────────────────────
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            // Verify the payment on the backend (HMAC-SHA256 check)
            const { data: verifyData } = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              delivery_address: deliveryAddress,
              coupon_code: couponCode || null,
              notes: notes || null,
            });

            setLoading(false);
            onSuccess?.(verifyData.order_number, verifyData.order_id);
          } catch (verifyError: unknown) {
            const msg =
              (verifyError as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
              'Payment succeeded but order confirmation failed. Please contact support with your payment ID.';
            setError(msg);
            setLoading(false);
            onFailure?.(msg);
          }
        },
      };

      // ── Step 5: Open the Razorpay checkout popup ──────────────────────
      const rzp = new window.Razorpay(options);
      rzpInstanceRef.current = rzp;

      // Handle payment failure from inside the popup
      rzp.on('payment.failed', (resp) => {
        const msg = resp.error?.description || 'Payment failed. Please try a different payment method.';
        setError(msg);
        setLoading(false);
        onFailure?.(msg);
      });

      rzp.open();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Could not initiate payment. Please try again.';
      setError(msg);
      setLoading(false);
      onFailure?.(msg);
    }
  }, [couponCode, notes, deliveryAddress, onSuccess, onFailure, onDismiss]);

  return { initiatePayment, loading, error, scriptReady };
}
