import type { Metadata } from "next";
import { Anton, Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { AppChrome } from "@/components/AppChrome";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Localy - Small Business Discovery",
  description: "Discover local small businesses through TikTok-style video scrolling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} ${anton.variable} ${inter.variable} antialiased h-full dark bg-[#1A1A18] text-[#F5F0E8]`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                <ActivityProvider>
                  <AppChrome>{children}</AppChrome>
                </ActivityProvider>
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
