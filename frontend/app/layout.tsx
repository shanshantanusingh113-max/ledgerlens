import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RunProvider } from "@/lib/run-store";

const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "./fonts/inter-v20-latin-200.ttf", weight: "200" },
    { path: "./fonts/inter-v20-latin-regular.ttf", weight: "400" },
    { path: "./fonts/inter-v20-latin-600.ttf", weight: "600" },
    { path: "./fonts/inter-v20-latin-700.ttf", weight: "700" },
  ],
});
const spartan = localFont({
  variable: "--font-spartan",
  src: [
    { path: "./fonts/league-spartan-v15-latin-600.ttf", weight: "600" },
    { path: "./fonts/league-spartan-v15-latin-700.ttf", weight: "700" },
    { path: "./fonts/league-spartan-v15-latin-800.ttf", weight: "800" },
  ],
});
const jetbrains = localFont({
  variable: "--font-jetbrains",
  src: [
    { path: "./fonts/jetbrains-mono-v24-latin-500.ttf", weight: "500" },
    { path: "./fonts/jetbrains-mono-v24-latin-600.ttf", weight: "600" },
  ],
});

export const metadata: Metadata = {
  title: "LedgerLens",
  description: "GST reconciliation that prices every mismatch in rupees, explains it and drafts the fix.",
};

// Runs before the first paint so the page never flashes the wrong canvas colour.
const THEME = `(function(){try{var t=localStorage.getItem("ll-theme");document.documentElement.dataset.theme=(t==="light"?"light":"dark")}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spartan.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body className="min-h-full">
        <RunProvider>{children}</RunProvider>
      </body>
    </html>
  );
}
