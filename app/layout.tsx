import "./globals.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

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
export const viewport: Viewport = { themeColor: "#FAFAFC" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("nn-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var r=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.dataset.theme=r;document.documentElement.dataset.themeMode=t}catch(e){document.documentElement.dataset.theme="light";document.documentElement.dataset.themeMode="light"}})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <div id="nn-boot" aria-hidden="true">
          <div className="nn-boot-inner">
            <span className="aurora-disc aurora-disc-32" />
            <span className="nn-boot-counter">0%</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
