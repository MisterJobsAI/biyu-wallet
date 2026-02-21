import "./globals.css";
import type { Metadata } from "next";
import SWRegister from "./sw-register";

export const metadata: Metadata = {
  title: "BiYú",
  description: "Tu dinero claro y bajo control",
  manifest: "/manifest.json",
  themeColor: "#000000",
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
          color: "rgba(255,255,255,0.92)",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
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
