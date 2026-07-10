import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

const display = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const ui = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ui", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "NeuralNexus",
  description: "Turn your expertise into reusable AI workspaces. Encode your method once — it runs, learns from your edits, and meets your quality bar.",
  manifest: "/manifest.json",
  openGraph: {
    title: "NeuralNexus",
    description: "Turn your expertise into reusable AI workspaces. Encode your method once — it runs, learns from your edits, and meets your quality bar.",
    siteName: "NeuralNexus",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NeuralNexus",
    description: "Turn your expertise into reusable AI workspaces. Encode your method once — it runs, learns from your edits, and meets your quality bar.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};
export const viewport: Viewport = { themeColor: "#0C0908" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
