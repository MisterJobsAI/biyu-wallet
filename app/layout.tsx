import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "BiYú",
  description: "Tu dinero claro y bajo control",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
