function storePhoneFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_STORE_PHONE?.trim() ||
    process.env.STORE_PHONE?.trim() ||
    ""
  );
}

const storePhone = storePhoneFromEnv();

/** Studio identity used when drafting client invoices for web & software work. */
export const BRAND = {
  name: "Northline Digital",
  shortName: "Northline",
  tagline: "Websites & software, shipped with clarity",
  description:
    "Northline Digital builds websites, web apps, and software products for startups and businesses.",
  supportRole: "Project lead",
  phone: storePhone,
  phoneDisplay: storePhone || "+916291129896",
  phoneTel: storePhone
    ? `+${storePhone.replace(/\D/g, "")}`
    : "+916291129896",
  email: "hello@northline.digital",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  domain: "northline.digital",
  address: "Andheri East, Mumbai, Maharashtra, India",
  logoPath: "/brand/vibemusic-logo.svg",
  headerLogoPath: "/brand/header-logo.webp",
  iconPath: "/icon-48.png",
  cardName: "Northline Digital",
  gearExchangeName: "Northline Digital",
  studiosName: "Northline Digital",
} as const;
