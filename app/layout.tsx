import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NeuralNexus",
  description: "Turn your expertise into reusable AI workspaces.",
  manifest: "/manifest.json",
  openGraph: {
    title: "NeuralNexus",
    description: "Turn your expertise into reusable AI workspaces.",
    siteName: "NeuralNexus",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NeuralNexus",
    description: "Turn your expertise into reusable AI workspaces.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};
export const viewport: Viewport = { themeColor: "#0C0908" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
