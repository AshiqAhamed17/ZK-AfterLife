import ClientThemeProvider from "@/components/ClientThemeProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { WalletProvider } from "@/lib/WalletContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "zk-afterlife-agent",
  description: "Private inheritance executor built on Aztec + Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ClientThemeProvider>
          <WalletProvider>
            <Header />
            <div className="min-h-[calc(100vh-56px-80px)]">{children}</div>
            <Footer />
          </WalletProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
