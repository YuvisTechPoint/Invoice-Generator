import "server-only";

import { getStudioSettings } from "@/lib/data/settingsStore";

export type StoreSettings = {
  storeName: string;
  storeAddress: string;
  storeEmail: string;
  storePhone: string;
  sellerState: string;
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const settings = getStudioSettings();
  const seller = settings.sellerDefaults;
  return {
    storeName: seller.storeName,
    storeAddress: seller.address,
    storeEmail: seller.email,
    storePhone: seller.phone,
    sellerState: seller.state,
  };
}
