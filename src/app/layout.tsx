import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Belezia Salon Laxmi Nagar",
  description: "Belezia Salon Laxmi Nagar - Ultra-Premium Unisex Salon & Spa Experience. Digital Invoicing, POS & Billing Suite.",
  metadataBase: new URL("https://belezia-salon-billing-app.vercel.app"),
  openGraph: {
    title: "Belezia Salon Laxmi Nagar",
    description: "Digital Tax Invoice & Salon Billing - Belezia Salon Laxmi Nagar",
    url: "https://belezia-salon-billing-app.vercel.app",
    siteName: "Belezia Salon Laxmi Nagar",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "Belezia Salon Laxmi Nagar",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Belezia Salon Laxmi Nagar",
    description: "Digital Tax Invoice & Salon Billing - Belezia Salon Laxmi Nagar",
    images: ["/icon.svg"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Belezia Salon",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased bg-[#09090b] text-zinc-100 font-sans selection:bg-purple-600 selection:text-white pb-24 md:pb-0"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
