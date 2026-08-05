import ClientThemeProvider from "@/components/ClientThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { WalletProvider } from "@/lib/WalletContext";
import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Serif display (the human / legal / heirloom voice) — used for headlines only.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZK-AfterLife — Private digital inheritance",
  description:
    "Pass on what matters, privately. A zero-knowledge inheritance protocol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <ClientThemeProvider>
          <WalletProvider>
            <ToastProvider>
              <Header />
              <div className="min-h-[calc(100vh-56px)]">{children}</div>
              <Footer />
            </ToastProvider>
          </WalletProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
