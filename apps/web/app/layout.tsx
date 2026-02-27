import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "EtherCode CRM OS",
  description: "MVP operativo multi-tenant"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
