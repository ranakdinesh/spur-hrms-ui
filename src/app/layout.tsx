import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TenantBrandingProvider } from "@/lib/tenant-branding";
import "./globals.css";

const appFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HRMS",
  description: "Setika HRMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${appFont.variable} min-h-full flex flex-col`}><TenantBrandingProvider>{children}</TenantBrandingProvider></body>
    </html>
  );
}
