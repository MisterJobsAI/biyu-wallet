import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiYú",
  description: "Tu dinero claro y bajo control",
  manifest: "/manifest.webmanifest",
  themeColor: "#8a2be2",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
