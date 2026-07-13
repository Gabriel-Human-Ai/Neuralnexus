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
export const viewport: Viewport = { themeColor: "#0C0908" };

const clerkAppearance = {
  variables: {
    colorPrimary: "#3157D5",
    colorBackground: "#FFFFFF",
    colorText: "#121417",
    colorTextSecondary: "#4D5661",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#121417",
    colorNeutral: "#6B7480",
    borderRadius: "10px",
    fontFamily: "var(--font-ui)",
  },
  elements: {
    modalBackdrop: {
      background: "rgba(18,20,23,0.38)",
      backdropFilter: "blur(12px)",
    },
    card: {
      boxShadow: "0 24px 64px rgba(18,20,23,0.14), 0 4px 16px rgba(18,20,23,0.06)",
      border: "1px solid rgba(18,20,23,0.08)",
      background: "#FFFFFF",
      color: "#121417",
    },
    headerTitle: { fontFamily: "var(--font-ui)", fontWeight: 600, color: "#121417" },
    headerSubtitle: { color: "#4D5661" },
    formFieldLabel: { color: "#121417", fontWeight: 500 },
    formFieldInput: {
      minHeight: "44px",
      border: "1px solid rgba(18,20,23,0.14)",
      borderRadius: "10px",
      background: "#FFFFFF",
      color: "#121417",
      boxShadow: "none",
    },
    formFieldInputShowPasswordButton: { color: "#4D5661" },
    formButtonPrimary: {
      minHeight: "44px",
      background: "#3157D5",
      color: "#FFFFFF",
      borderRadius: "10px",
      fontWeight: 500,
      boxShadow: "0 8px 18px rgba(49,87,213,0.18)",
      "&:hover": { background: "#284AB8" },
    },
    socialButtonsBlockButton: {
      minHeight: "44px",
      border: "1px solid rgba(18,20,23,0.12)",
      background: "#FFFFFF",
      color: "#121417",
      borderRadius: "10px",
      boxShadow: "0 1px 2px rgba(18,20,23,0.04)",
    },
    socialButtonsBlockButtonText: { color: "#121417", fontWeight: 500 },
    footerActionLink: { color: "#3157D5", fontWeight: 500 },
    dividerLine: { background: "rgba(18,20,23,0.12)" },
    dividerText: { color: "#6B7480" },
    identityPreviewText: { color: "#121417" },
    otpCodeFieldInput: {
      border: "1px solid rgba(18,20,23,0.14)",
      background: "#FFFFFF",
      color: "#121417",
    },
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
    <html lang="en" data-theme="dark" className={`${ui.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("nn-theme")||"dark";var r=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var d=document.documentElement;d.dataset.theme=r;d.dataset.themeMode=t;d.style.colorScheme=r}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.dataset.themeMode="dark";document.documentElement.style.colorScheme="dark"}})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider appearance={clerkAppearance}>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
