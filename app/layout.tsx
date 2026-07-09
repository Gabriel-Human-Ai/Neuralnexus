import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NeuralNexus",
  description: "Turn your expertise into reusable AI workspaces.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#050607" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
