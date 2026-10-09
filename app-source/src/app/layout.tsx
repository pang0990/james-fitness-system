import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";
export const metadata: Metadata = {
  title: "James · Fitness System",
  description: "飲食、訓練與每一次進步。James Fitness System 本機測試版。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121411",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
