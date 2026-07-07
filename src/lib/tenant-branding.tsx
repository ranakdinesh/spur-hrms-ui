"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { TENANT_BASE_DOMAIN } from "@/lib/tenant-domain";

export type TenantBranding = {
  tenant_id?: string;
  subdomain?: string;
  display_name?: string | null;
  logo_path?: string | null;
  favicon_path?: string | null;
  layout: string;
  color_mode: string;
  sidebar_size: string;
  layout_width: string;
  card_layout: string;
  theme_color: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  topbar_color: string;
  sidebar_color: string;
  topbar_background: string;
  sidebar_background: string;
  font_family: string;
  preloader: boolean;
};

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  layout: "vertical",
  color_mode: "light",
  sidebar_size: "default",
  layout_width: "fluid",
  card_layout: "bordered",
  theme_color: "#588368",
  primary_color: "#588368",
  secondary_color: "#e87839",
  tertiary_color: "#f2b36d",
  topbar_color: "#fffaf4",
  sidebar_color: "#426b53",
  topbar_background: "none",
  sidebar_background: "solid",
  font_family: 'var(--font-app), "Plus Jakarta Sans", "Segoe UI", sans-serif',
  preloader: true,
};

type TenantBrandingContextValue = {
  branding: TenantBranding;
  loading: boolean;
  reloadBranding: () => Promise<void>;
  setTenantBranding: (branding: TenantBranding) => void;
};

const TenantBrandingContext = createContext<TenantBrandingContextValue>({
  branding: DEFAULT_TENANT_BRANDING,
  loading: false,
  reloadBranding: async () => undefined,
  setTenantBranding: () => undefined,
});

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_TENANT_BRANDING);
  const [loading, setLoading] = useState(true);

  const setTenantBranding = useCallback((nextBranding: TenantBranding) => {
    setBranding({ ...DEFAULT_TENANT_BRANDING, ...nextBranding });
  }, []);

  const reloadBranding = useCallback(async () => {
    if (typeof window === "undefined") return;
    const host = window.location.host;
    if (!host || shouldUseDefaultBranding(host)) {
      setBranding(DEFAULT_TENANT_BRANDING);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resolved = await apiRequest<TenantBranding>(`/hrms/branding/resolve?host=${encodeURIComponent(host)}`);
      setTenantBranding(resolved);
    } catch {
      setBranding(DEFAULT_TENANT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, [setTenantBranding]);

  useEffect(() => {
    let cancelled = false;
    window.setTimeout(() => {
      if (!cancelled) void reloadBranding();
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [reloadBranding]);

  useEffect(() => {
    applyTenantBranding(branding);
  }, [branding]);

  const value = useMemo(() => ({ branding, loading, reloadBranding, setTenantBranding }), [branding, loading, reloadBranding, setTenantBranding]);
  return <TenantBrandingContext.Provider value={value}>{children}</TenantBrandingContext.Provider>;
}

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}

function shouldUseDefaultBranding(host: string) {
  const normalizedHost = host.split(":")[0]?.toLowerCase() || "";
  const baseDomain = TENANT_BASE_DOMAIN.toLowerCase();
  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === baseDomain ||
    normalizedHost === `www.${baseDomain}`
  );
}

function applyTenantBranding(branding: TenantBranding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--brand-theme", branding.theme_color);
  root.style.setProperty("--brand-primary", branding.primary_color);
  root.style.setProperty("--brand-secondary", branding.secondary_color);
  root.style.setProperty("--brand-tertiary", branding.tertiary_color);
  root.style.setProperty("--brand-topbar", branding.topbar_color);
  root.style.setProperty("--brand-sidebar", branding.sidebar_color);
  root.style.setProperty("--brand-font", branding.font_family);

  if (branding.favicon_path) {
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = branding.favicon_path;
  }

  if (branding.display_name || branding.subdomain) {
    document.title = `${branding.display_name || branding.subdomain} HRMS`;
  }
}
