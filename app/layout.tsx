import type { Metadata } from "next";
import "@/assets/globals.css";
import { Geist, Geist_Mono } from "next/font/google";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "beRichHub-gpt",
  description: "beRichHub-gpt is a Next.js application that provides a platform for developers to interact with AI models and explore various features.",
  keywords: [
    "Next.js",
    "AI",
    "beRichHub-gpt",
    "web application",
    "LLM",
    "artificial intelligence",
  ],
  authors: [
    {
      name: "coldbydefault",
      url: "www.coldbydefault.com/beRichHub",
    },
  ],
  creator: "coldbydefault",   
};

export default function RootLayout({ children,}: Readonly<{ children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
