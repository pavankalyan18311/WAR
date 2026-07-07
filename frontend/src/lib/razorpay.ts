/**
 * Razorpay TypeScript types & script loader
 * -----------------------------------------
 * Razorpay does not publish an official @types package.
 * These typings cover everything needed for the standard checkout flow.
 */

// ── Razorpay Checkout Options ─────────────────────────────────────────────────
export interface RazorpayOptions {
  /** Your Razorpay Key ID (test: rzp_test_... / live: rzp_live_...) */
  key: string;
  /** Order amount in paise (₹1 = 100 paise). Must match server-created order. */
  amount: number;
  /** Always "INR" for Indian Rupee */
  currency: string;
  /** Business name shown in the popup */
  name: string;
  /** Optional order description */
  description?: string;
  /** URL of logo shown in popup (should be square, < 256 KB) */
  image?: string;
  /** Razorpay order_id returned from your backend's /create-order endpoint */
  order_id: string;
  /** Pre-fill customer details so the user doesn't have to retype them */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;  // 10-digit mobile with country code e.g. "9876543210"
  };
  /** Optional theme customisation */
  theme?: {
    /** Hex colour for the popup header/CTAs */
    color?: string;
    /** Hide the top bar */
    hide_topbar?: boolean;
  };
  /** Restrict which payment methods are shown */
  config?: {
    display?: {
      /** "en" | "hi" | "mr" etc. */
      language?: string;
      /** Restrict to specific payment methods */
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  /** Modal behaviour */
  modal?: {
    /** Close popup when user presses Escape. Default true. */
    escape?: boolean;
    /** Called when user closes the popup without paying */
    ondismiss?: () => void;
    /** If true, shows a confirmation prompt before closing */
    confirm_close?: boolean;
    /** Back-drop click handler */
    handleback?: boolean;
  };
  /**
   * Callback when payment is SUCCESSFUL.
   * These three values must be sent to your backend for server-side signature verification.
   */
  handler: (response: RazorpaySuccessResponse) => void;
  /** If provided, the user is redirected here on success instead of calling `handler` */
  callback_url?: string;
  /** Redirect the user back to this URL after a failed payment */
  redirect?: boolean;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      payment_id?: string;
      order_id?: string;
    };
  };
}

// Global window augmentation — Razorpay injects itself as window.Razorpay
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open(): void;
      close(): void;
      on(event: 'payment.failed', handler: (response: RazorpayErrorResponse) => void): void;
    };
  }
}

// ── Script loader ─────────────────────────────────────────────────────────────

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptLoadPromise: Promise<void> | null = null;

/**
 * Loads the Razorpay checkout.js script exactly once and caches the promise.
 * Safe to call multiple times — subsequent calls return the cached promise.
 */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cannot load Razorpay script on the server'));
  }

  // Already loaded
  if (window.Razorpay) return Promise.resolve();

  // Already loading — return existing promise
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null; // allow retry on next call
      reject(new Error('Failed to load Razorpay checkout script. Check internet connectivity.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}
