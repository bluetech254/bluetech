import type { Metadata } from "next";
import "./globals.css";
import SuppressWarnings from "@/components/SuppressWarnings";

export const metadata: Metadata = {
  title: "BlueTech — Admin",
  description: "Admin panel for BlueTech e-commerce & repair booking platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body min-h-screen"><SuppressWarnings />{children}</body>
    </html>
  );
}
