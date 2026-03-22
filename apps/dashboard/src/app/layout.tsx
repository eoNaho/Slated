import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PixelReel | Command Center",
  description: "Administrative interface for the PixelReel platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased selection:bg-accent/30 selection:text-white bg-background text-foreground`}>
        <div className="cinematic-bg" />
        <div className="art-grid" />
        <div className="scanlines" />
        {children}
      </body>
    </html>
  );
}
