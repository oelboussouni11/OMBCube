import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMBCube | Rubik's Cube Scanner & Solver",
  description:
    "Scan, solve, and learn Rubik's Cube with AI-powered camera scanning, Kociemba solver, interactive 3D visualization, and speedcubing timer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/OMBCube/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
