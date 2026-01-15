import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

// Distinctive body font with personality
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const cabinetGrotesk = localFont({
  src: [
    {
      path: "../fonts/CabinetGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/CabinetGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/CabinetGrotesk-Extrabold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-cabinet",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pitchnode.ai"),
  title: "PitchNode - Master Every Sales Conversation",
  description:
    "Practice live sales calls and pitches against AI opponents. Map every response. Master objections. Prove readiness before the real thing.",
  keywords: [
    "sales training",
    "pitch practice",
    "AI sales",
    "objection handling",
    "pitch coaching",
    "sales roleplay",
    "AI sales training",
    "sales skills",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PitchNode - Master Every Sales Conversation",
    description:
      "Practice live sales calls and pitches against AI opponents. Map every response. Master objections. Prove readiness before the real thing.",
    type: "website",
    url: "https://pitchnode.ai",
    siteName: "PitchNode",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PitchNode - Master Every Sales Conversation",
    description:
      "Practice live sales calls and pitches against AI opponents. Map every response. Master objections.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${cabinetGrotesk.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
