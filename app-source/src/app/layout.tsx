import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-context";
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
import "./minimal-theme.css";
import "./monochrome-experience-v2.css";
import { AppearanceController } from "@/components/appearance";
import { NavigationMotion } from "@/components/navigation-motion";
import { AppInstall } from "@/components/app-install";
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
  themeColor: "#070708",
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
