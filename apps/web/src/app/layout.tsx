import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sustainmetric — Urban Climate Intelligence",
  description:
    "The first multimodal intelligence engine that reads the data Indian cities generate and turns it into climate action a corporate auditor will accept.",
  openGraph: {
    title: "Sustainmetric",
    description: "Seeing the cities we cannot feel.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-bg text-text-primary font-body antialiased">
        {children}
      </body>
    </html>
  );
}
