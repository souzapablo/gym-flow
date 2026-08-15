import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const typewriter = IBM_Plex_Mono({
  variable: "--font-typewriter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Minha Ficha",
  description: "Seu treino, série por série.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ded8c8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${typewriter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
