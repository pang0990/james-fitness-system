import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-context";
/* Legacy route structure and original Cinematic presentation. */
import "./globals.css";
import "./cinematic.css";
import "./blueprint.css";
import "./polish.css";
import "./city-atmosphere.css";
import "./reference-v3.css";
import "./cookbook-city-v4.css";
import "./city-recipes-v5.css";
import "./today-reference.css";
import "./today-motion.css";
import "./today-fullbleed.css";
import "./auth.css";
/* Minimal production: tokens -> shell -> common components -> page layouts. */
import "./minimal-theme.css";
import "./tokens-v3.css";
import "./app-shell-v3.css";
import "./components-v3.css";
import "./glass-system-v2.css";
import "./nutrition-v3b.css";
import "./training-v3.css";
import "./today-v3.css";
/* Dev-only material lab; selectors are restricted to .jfs-showcase. */
import "./glass-experience-v4.css";
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
  themeColor: "#000000",
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
