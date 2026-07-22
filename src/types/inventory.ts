export type InventoryLogAction =
  | "order_created"
  | "order_paid"
  | "order_cancelled"
  | "manual_adjustment"
  | "bulk_import";

export type OrderInventoryStatus =
  | "none"
  | "reserved"
  | "fulfilled"
  | "released";

export interface InventoryLog {
  id: string;
  productId: string;
  sku: string;
  orderId?: string | null;
  previousStock: number;
  newStock: number;
  quantityChanged: number;
  action: InventoryLogAction;
  adminId?: string | null;
  timestamp: string;
  /** Reserved quantity before/after when action affects reservations */
  previousReserved?: number;
  newReserved?: number;
  note?: string;
}

export interface OrderInventoryLine {
  productId: string;
  variantId?: string;
  quantity: number;
  name?: string;
}

export interface ProductStockSnapshot {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  status: string;
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
