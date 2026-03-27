import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { SentryInit } from "@/components/sentry-init";

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
  metadataBase: new URL("https://convosparr.io"),
  title: {
    default: "ConvoSparr: Master Every Sales Conversation",
    template: "%s | ConvoSparr",
  },
  description:
    "Practice pitch meetings, cold calls, discovery calls, demos, objections, negotiations, and closing conversations against AI opponents. Master every sales conversation before it happens.",
  keywords: [
    "sales training",
    "sales conversation practice",
    "AI sales simulation",
    "cold call practice",
    "discovery call training",
    "objection handling",
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
    title: "ConvoSparr: Master Every Sales Conversation",
    description:
      "Practice pitch meetings, cold calls, discovery calls, demos, objections, negotiations, and closing conversations against AI opponents. Master every sales conversation before it happens.",
    type: "website",
    url: "https://convosparr.io",
    siteName: "ConvoSparr",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ConvoSparr: Master Every Sales Conversation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConvoSparr: Master Every Sales Conversation",
    description:
      "Practice pitch meetings, cold calls, discovery calls, demos, objections, and negotiations against AI opponents. Master every sales conversation.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
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
        {/* JSON-LD Structured Data */}
        {/* SECURITY: Static hardcoded content only. Never interpolate user data here. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "ConvoSparr",
                  url: "https://convosparr.io",
                  logo: "https://convosparr.io/branding/logo.svg",
                  description:
                    "AI-powered sales conversation practice platform. Train for every pitch, cold call, discovery, demo, objection, negotiation, and close.",
                },
                {
                  "@type": "WebApplication",
                  name: "ConvoSparr",
                  url: "https://convosparr.io",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  description:
                    "Practice pitch meetings, cold calls, discovery calls, demos, objections, negotiations, and closing conversations against AI opponents. Master every sales conversation before it happens.",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                  },
                },
              ],
            }),
          }}
        />
        {/* Prevent flash of wrong theme */}
        {/* SECURITY: Static hardcoded content only. Never interpolate user data here. */}
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
        <SentryInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
