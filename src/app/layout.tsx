import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "LIFE CARE HOSPITAL — Nawagai, Buner",
  description:
    "Hospital Management System for LIFE CARE HOSPITAL, Nawagai, Buner. Manage patients, appointments, doctors, and billing in one place.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
