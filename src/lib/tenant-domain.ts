const configuredTenantBaseDomain = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "").replace(/^\.+|\.+$/g, "");

export function getTenantBaseDomain(host?: string) {
  const normalizedHost = normalizeHost(host || (typeof window !== "undefined" ? window.location.host : ""));
  if (normalizedHost) {
    if (configuredTenantBaseDomain && (isLocalHost(normalizedHost) || normalizedHost === configuredTenantBaseDomain || normalizedHost.endsWith(`.${configuredTenantBaseDomain}`))) {
      return configuredTenantBaseDomain;
    }
    if (normalizedHost === "dev.setika.one" || normalizedHost.endsWith(".dev.setika.one")) {
      return "dev.setika.one";
    }
    if (normalizedHost === "setika.com" || normalizedHost === "www.setika.com" || normalizedHost.endsWith(".setika.com")) {
      return "setika.com";
    }
    if (normalizedHost === "setika.one" || normalizedHost === "www.setika.one" || normalizedHost.endsWith(".setika.one")) {
      return "setika.one";
    }
  }
  return configuredTenantBaseDomain || "setika.one";
}

export const TENANT_BASE_DOMAIN = getTenantBaseDomain();

export function tenantHost(subdomain: string, baseDomain = getTenantBaseDomain()) {
  return `${subdomain}.${baseDomain}`;
}

export function normalizeHost(host: string) {
  return (host || "").split(":")[0]?.toLowerCase().replace(/\.$/, "") || "";
}

export function isTenantHost(host: string) {
  const normalized = normalizeHost(host);
  const base = getTenantBaseDomain(normalized).toLowerCase();
  if (!normalized || isLocalHost(normalized) || normalized === base || normalized === `www.${base}`) {
    return false;
  }
  if (!normalized.endsWith(`.${base}`)) {
    return false;
  }
  const subdomain = normalized.slice(0, -(base.length + 1));
  return Boolean(subdomain) && !subdomain.includes(".") && !reservedTenantSubdomains.has(subdomain);
}

const reservedTenantSubdomains = new Set(["admin", "api", "app", "auth", "billing", "dev", "files", "identity", "mail", "staging", "support", "www"]);

function isLocalHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
