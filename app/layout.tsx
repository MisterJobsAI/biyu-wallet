import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiYú",
  description: "Tu dinero claro y bajo control",
  applicationName: "BiYú",
  appleWebApp: {
    capable: true,
    title: "BiYú",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#8e24aa", // morado/magenta
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
