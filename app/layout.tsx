import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slide Submission",
  description: "Upload your presentation slides for the project defense.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
