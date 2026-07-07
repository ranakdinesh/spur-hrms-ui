const subdomainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const reservedSubdomains = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "dev",
  "files",
  "identity",
  "mail",
  "staging",
  "support",
  "www",
]);

const businessSuffixes = new Set([
  "co",
  "company",
  "consultants",
  "consulting",
  "corp",
  "corporation",
  "digital",
  "enterprise",
  "enterprises",
  "global",
  "india",
  "inc",
  "infotech",
  "it",
  "limited",
  "llp",
  "ltd",
  "private",
  "pvt",
  "service",
  "services",
  "solution",
  "solutions",
  "software",
  "system",
  "systems",
  "tech",
  "technologies",
  "technology",
]);

export function validateTenantSubdomain(value: string) {
  const subdomain = value.trim().toLowerCase();
  if (!subdomain) return "Tenant subdomain is required.";
  if (!subdomainPattern.test(subdomain)) return "Use lowercase letters, numbers, and hyphens. Do not start or end with a hyphen.";
  if (reservedSubdomains.has(subdomain)) return "This subdomain is reserved for Setika system use.";
  const parts = subdomain.split("-").filter(Boolean);
  if (parts.length > 1 && businessSuffixes.has(parts[parts.length - 1])) {
    return "Use a short tenant code such as aanvi, not a company descriptor such as aanvi-infotech.";
  }
  return "";
}
