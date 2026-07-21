import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GAM Analytics",
    template: "%s | GAM Analytics"
  },
  description: "Sistema de gestão operacional da unidade G.A.M — OÁSIS RP",
  applicationName: "GAM Analytics",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/gam-favicon-64.png",
        type: "image/png",
        sizes: "64x64"
      },
      {
        url: "/gam-icon-192.png",
        type: "image/png",
        sizes: "192x192"
      }
    ],
    shortcut: "/gam-favicon-64.png",
    apple: [
      {
        url: "/gam-icon-192.png",
        type: "image/png",
        sizes: "192x192"
      }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
