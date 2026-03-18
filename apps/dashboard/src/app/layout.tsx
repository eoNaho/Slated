import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PixelReel | Command Center",
  description: "Administrative interface for the PixelReel platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased selection:bg-accent/30 selection:text-white bg-background text-foreground`}
      >
        <div className="flex min-h-screen relative overflow-hidden">
          {/* Cinematic Layering */}
          <div className="cinematic-bg" />
          <div className="art-grid" />
          <div className="scanlines" />
          
          <Sidebar />
          
          <main className="flex-1 lg:ml-64 min-w-0 min-h-screen py-6 px-6 lg:py-10 lg:px-12 relative z-10 overflow-y-auto">
             {children}
          </main>
        </div>
      </body>
    </html>
  );
}
