import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Satin Liquid Glass — one accent (amber/brass), everything else monochrome white-alpha.
        ink: "#0A0B0D",
        violet: "#C9A05C",   // the single accent (token kept for minimal diff)
        coral: "#C9A05C",
        plum: "#C9A05C",     // was a second accent — now aliased to the same one
        mist: "rgba(255,255,255,0.62)",
        snow: "rgba(255,255,255,0.92)",
        walnut: "#2A2B2E",
        signalGreen: "#C9A05C",
        signalRed: "#C9A05C",
        haze: "rgba(255,255,255,0.05)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { xl2: "16px" }
    }
  },
  plugins: []
} satisfies Config;
