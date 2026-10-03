function storePhoneFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_STORE_PHONE?.trim() ||
    process.env.STORE_PHONE?.trim() ||
    ""
  );
}

const storePhone = storePhoneFromEnv();

/** Default app identity and seller placeholders for new invoices. */
export const BRAND = {
  name: "Invoice Generator",
  shortName: "Invoice",
  tagline: "Create and share invoices in minutes",
  description:
    "Create, preview, download, and share professional invoices — fast and simple.",
  supportRole: "Accounts",
  phone: storePhone,
  phoneDisplay: storePhone || "+91 98765 43210",
  phoneTel: storePhone
    ? `+${storePhone.replace(/\D/g, "")}`
    : "+919876543210",
  email: "billing@example.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  domain: "example.com",
  address: "Your city, state, India",
  logoPath: "/brand/logo.svg",
  headerLogoPath: "/brand/logo.svg",
  iconPath: "/icon.svg",
  cardName: "Invoice Generator",
  gearExchangeName: "Invoice Generator",
  studiosName: "Invoice Generator",
} as const;
