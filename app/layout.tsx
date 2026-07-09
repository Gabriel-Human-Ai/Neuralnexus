import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Jarvis Bridge",
  description: "Dein AI Command Center – eine Oberfläche, mehrere Modelle, gemeinsames Gedächtnis.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#0F0817" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
