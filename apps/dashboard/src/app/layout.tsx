import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
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
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.205 0 0)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(0.985 0 0)",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
