import "./globals.css";
import type { Metadata } from "next";
import SWRegister from "./sw-register";

export const metadata: Metadata = {
  title: "BiYú",
  description: "Tu dinero claro y bajo control",
  manifest: "/manifest.json",
  themeColor: "#000000",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        style={{
          background: "#0b0b0f",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
