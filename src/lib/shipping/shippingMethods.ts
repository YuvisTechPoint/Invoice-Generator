import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_CHARGE,
} from "@/lib/invoiceTotals";

export type ShippingMethod = "standard" | "express" | "overnight";

export interface ShippingMethodConfig {
  id: ShippingMethod;
  label: string;
  description: string;
  charge: number;
  etaDays: string;
}

export const SHIPPING_METHODS: Record<ShippingMethod, ShippingMethodConfig> = {
  standard: {
    id: "standard",
    label: "Standard",
    description: "Delivered in 5–7 business days",
    charge: STANDARD_SHIPPING_CHARGE,
    etaDays: "5-7",
  },
  express: {
    id: "express",
    label: "Express",
    description: "Delivered in 2–3 business days",
    charge: 0,
    etaDays: "2-3",
  },
  overnight: {
    id: "overnight",
    label: "Overnight",
    description: "Next business day in metro cities",
    charge: 0,
    etaDays: "1",
  },
};

export const SHIPPING_METHOD_IDS = Object.keys(
  SHIPPING_METHODS
) as ShippingMethod[];

export function isShippingMethod(value: string): value is ShippingMethod {
  return SHIPPING_METHOD_IDS.includes(value as ShippingMethod);
}

/** Shipping is free for every method and cart total. */
export function getShippingChargeForMethod(
  _method: ShippingMethod,
  _subtotal: number,
  _discount: number
): number {
  void FREE_SHIPPING_THRESHOLD;
  return 0;
}

export function getDefaultShippingMethod(): ShippingMethod {
  return "standard";
}
