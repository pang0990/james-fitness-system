import "@/styles/index.css";
import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-context";
import { AppearanceController } from "@/components/appearance";
import { NavigationMotion } from "@/components/navigation-motion";
import { AppInstall } from "@/components/app-install";
import { ReviewPreviewBanner } from "@/components/review-preview-banner";

export const metadata: Metadata = {
  title: "James · Fitness System",
  description: "Nutrition · Training · Progress",
  manifest: (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "James" },
  icons: { apple: (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/icon-192.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f8f6",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <ReviewPreviewBanner />
        <AuthProvider>
          <StoreProvider>
          <AppearanceController />
          {children}
          <AppInstall />
          <NavigationMotion />
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
