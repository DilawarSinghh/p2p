import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { RoleProvider } from "@/lib/role-context";

export const metadata: Metadata = {
  title: "Predictive Circular-Resource Grid",
  description: "AI-driven resource grid for a multi-building campus (P2P 2026)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">
        <RoleProvider>
          <div className="flex">
            <Nav />
            <main className="flex-1 min-h-screen p-6 max-w-[1400px]">{children}</main>
          </div>
        </RoleProvider>
      </body>
    </html>
  );
}
