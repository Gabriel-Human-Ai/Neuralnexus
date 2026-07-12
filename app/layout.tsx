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

const clerkAppearance = {
  variables: {
    colorPrimary: "#7C6CF6",
    colorBackground: "#FFFFFF",
    colorText: "#0D0D12",
    colorInputBackground: "#F1F1F4",
    colorInputText: "#0D0D12",
    borderRadius: "12px",
    fontFamily: "var(--font-ui)",
  },
  elements: {
    card: {
      boxShadow: "0 24px 64px rgba(13,13,18,0.12), 0 4px 16px rgba(13,13,18,0.06)",
      border: "1px solid rgba(13,13,18,0.08)",
      background: "#FFFFFF",
    },
    formButtonPrimary: {
      background: "#0D0D12",
      color: "#FFFFFF",
      borderRadius: "999px",
      fontWeight: 500,
      "&:hover": { filter: "brightness(1.05)" },
    },
    headerTitle: { fontFamily: "var(--font-ui)", fontWeight: 600, color: "#0D0D12" },
    socialButtonsBlockButton: { border: "1px solid rgba(13,13,18,0.08)", background: "#F1F1F4" },
    footerActionLink: { color: "#7C6CF6" },
    formFieldInput: { border: "1px solid rgba(13,13,18,0.08)", borderRadius: "10px" },
  },
};

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
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider appearance={clerkAppearance}>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
