import type { ShippingMethod } from "@/lib/shipping/shippingMethods";
import type { InvoiceData } from "@/lib/invoiceTotals";
import type { OrderInventoryStatus } from "@/types/inventory";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cod_pending"
  | "refunded";

export type PaymentMethod = "razorpay" | "upi" | "net_banking" | "cod";

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  variantSku?: string;
  variantLabel?: string;
  name: string;
  quantity: number;
  /** Unit price (INR). */
  price: number;
}

export interface Order {
  id: string;
  userId?: string;
  email: string;
  /** Secret token for guest order tracking and reservation release. */
  trackingToken?: string;
  /** Customer display name (shipping name or guest name). */
  customerName?: string;
  /** Customer phone for guest orders and notifications. */
  customerPhone?: string;
  isGuestOrder?: boolean;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  couponCode?: string | null;
  couponDiscount: number;
  shippingCharge: number;
  shippingMethod?: ShippingMethod;
  platformFee: number;
  total: number;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  invoice?: InvoiceData;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayRefundId?: string | null;
  inventoryStatus?: OrderInventoryStatus;
  couponUsageApplied?: boolean;
  paymentCompletedAt?: string;
  paymentSource?: "client_verify" | "webhook";
  paymentFailureReason?: string | null;
  refundedAt?: string;
  /** Payment due date (ISO). Studio invoice drafts. */
  dueDate?: string;
  /** Human-readable payment terms (e.g. Net 15). */
  paymentTerms?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  items: Array<{
    productId: string;
    variantId?: string;
    variantSku?: string;
    variantLabel?: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  email: string;
  customerName?: string;
  customerPhone?: string;
  couponCode?: string | null;
  couponDiscount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  buyerState: string;
  shippingMethod?: ShippingMethod;
}

export interface CreateRazorpayOrderResponse {
  orderId: string;
  trackingToken?: string;
  demoMode?: boolean;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
}

export interface ResumePaymentResponse {
  orderId: string;
  email: string;
  demoMode: boolean;
  razorpay?: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
  shipping?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface DemoPaymentResponse {
  success: boolean;
  orderId: string;
  redirectUrl: string;
  order?: Order;
}

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  orderId: string;
  paymentStatus: PaymentStatus;
  order?: Order;
}
