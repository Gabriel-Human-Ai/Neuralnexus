import "./globals.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

const ui = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ui", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "NeuralNexus",
  description: "Your AI personality, in one profile. Build it just by using NeuralNexus. Then every AI — ChatGPT, Claude, image generators — instantly knows how to talk, write and create for you.",
  manifest: "/manifest.json",
  openGraph: {
    title: "NeuralNexus",
    description: "Your AI personality, in one profile. Build it just by using NeuralNexus. Then every AI — ChatGPT, Claude, image generators — instantly knows how to talk, write and create for you.",
    siteName: "NeuralNexus",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NeuralNexus",
    description: "Your AI personality, in one profile. Build it just by using NeuralNexus. Then every AI — ChatGPT, Claude, image generators — instantly knows how to talk, write and create for you.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};
export const viewport: Viewport = { themeColor: "#FAFAFC" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <>
      <div id="nn-boot" aria-hidden="true">
        <div className="nn-boot-inner">
          <span className="aurora-disc aurora-disc-32" />
          <span className="nn-boot-counter">0%</span>
        </div>
      </div>
      {children}
    </>
  );

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
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
