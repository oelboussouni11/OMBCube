import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMBCube | Rubik's Cube Scanner & Solver",
  description:
    "Scan, solve, and learn Rubik's Cube with AI-powered camera scanning, Kociemba solver, interactive 3D visualization, and speedcubing timer.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
