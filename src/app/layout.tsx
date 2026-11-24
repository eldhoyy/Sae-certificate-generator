import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certify — Certificate Management",
  description: "Create, issue and verify certificates with confidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
