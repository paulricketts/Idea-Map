import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idea Map - Content Curation Platform",
  description: "A platform for cataloging and connecting ideas from articles, videos, podcasts, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
