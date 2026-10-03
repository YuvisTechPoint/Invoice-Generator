import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Invoice Generator",
    template: "%s · Invoice Generator",
  },
  description:
    "Create, preview, download, and share professional invoices.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="studio-app">{children}</body>
    </html>
  );
}
