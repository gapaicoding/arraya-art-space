import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Arayya Art & Space",
  description: "Activity & Space Management",
  icons: {
    icon: "/logo-arayya.jpg",
    shortcut: "/logo-arayya.jpg",
    apple: "/logo-arayya.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="font-body text-ink antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
