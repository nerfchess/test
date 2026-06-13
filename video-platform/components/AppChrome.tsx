"use client";

import { usePathname } from "next/navigation";
import { ActivityPanel } from "@/components/ActivityPanel";
import { AppBottomNav } from "@/components/AppBottomNav";
import { CursorOrb } from "@/components/CursorOrb";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { PersistentVideoFeed } from "@/components/PersistentVideoFeed";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketingHome = pathname === "/";

  if (isMarketingHome) {
    return (
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <div className="premium-blob premium-blob--amber" aria-hidden="true" />
      <div className="premium-blob premium-blob--sage" aria-hidden="true" />
      <div className="premium-blob premium-blob--warm" aria-hidden="true" />
      <CursorOrb />
      <PersistentVideoFeed />
      <div className="app-layout">
        <DesktopSidebar />
        <main id="main-content" className="responsive-container">
          {children}
        </main>
      </div>
      <AppBottomNav />
      <ActivityPanel />
    </>
  );
}
