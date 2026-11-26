import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Archivo needs the width axis for the 75% condensed title and times.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zach Attack",
  description: "The bachelor weekend. Dec 18-19, Portland and Hillsboro.",
  // The site is shared by link only. Keep addresses out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Mirrors --color-hero. Metadata cannot read CSS variables.
  themeColor: "#2d4f9e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
