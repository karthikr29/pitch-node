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
  metadataBase: new URL("https://convosparr.io"),
  title: {
    default: "ConvoSparr: Master Every Sales Conversation",
    template: "%s | ConvoSparr",
  },
  description:
    "Practice real sales conversations against AI opponents before the real meeting happens. Master objections, refine your pitch, close with confidence.",
  keywords: [
    "sales training",
    "sales conversation practice",
    "AI sales coach",
    "objection handling",
    "pitch practice",
    "sales roleplay",
    "AI sales training",
    "sales skills",
    "ConvoSparr",
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
      "Practice real sales conversations against AI opponents before the real meeting happens. Master objections, refine your pitch, close with confidence.",
    type: "website",
    url: "https://convosparr.io",
    siteName: "ConvoSparr",
    locale: "en_US",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConvoSparr: Master Every Sales Conversation",
    description:
      "Practice real sales conversations against AI opponents before the real meeting happens. Master objections, refine your pitch, close with confidence.",
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
