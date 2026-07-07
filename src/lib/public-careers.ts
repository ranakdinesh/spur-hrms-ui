import type { Metadata } from "next";

export type PublicBranding = {
  display_name?: string | null;
  logo_path?: string | null;
  favicon_path?: string | null;
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
  sidebar_color?: string;
};

export type PublicOpening = {
  id: string;
  code?: string | null;
  title?: string | null;
  job_summary?: string | null;
  description?: string | null;
  job_category?: string | null;
  department_name?: string | null;
  employment_type_name?: string | null;
  work_mode?: string | null;
  role_type?: string | null;
  min_experience?: number | null;
  max_experience?: number | null;
  min_salary?: number | null;
  max_salary?: number | null;
  salary_currency?: string | null;
  salary_period?: string | null;
  is_salary_visible: boolean;
  publish_date?: string | null;
  expiry_date?: string | null;
  created_at?: string | null;
  slug?: string;
  public_url?: string;
};

export type PublicCareersPage = {
  tenant: { tenant_id: string; subdomain: string; display_name: string };
  branding?: PublicBranding | null;
  content: {
    headline: string;
    welcome_message?: string;
    about: string;
    core_values: string[];
    notices?: string[];
    seo_title?: string;
    seo_description?: string;
    featured_job_ids?: string[];
    candidate_cta?: string;
    login_button_text?: string;
  };
  openings: PublicOpening[];
};

export function logoSrc(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/${path.replace(/^\/+/, "")}`;
}

export function openingTitle(opening?: PublicOpening | null) {
  return opening?.title?.trim() || "Job opening";
}

export function openingSlug(opening: PublicOpening) {
  return opening.slug || `${slugify(openingTitle(opening))}-${opening.id}`;
}

export function findOpeningBySlug(page: PublicCareersPage, slug: string) {
  return page.openings.find((opening) => openingSlug(opening) === slug || slug.endsWith(opening.id));
}

export function salaryLabel(opening: PublicOpening) {
  if (!opening.is_salary_visible || opening.min_salary == null || opening.max_salary == null) return "";
  const currency = opening.salary_currency || "INR";
  const format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency });
  return `${format.format(opening.min_salary)} - ${format.format(opening.max_salary)}${opening.salary_period ? ` / ${opening.salary_period}` : ""}`;
}

export function experienceLabel(opening: PublicOpening) {
  if (opening.min_experience == null && opening.max_experience == null) return "";
  if (opening.min_experience != null && opening.max_experience != null) return `${opening.min_experience}-${opening.max_experience} yrs`;
  if (opening.min_experience != null) return `${opening.min_experience}+ yrs`;
  return `Up to ${opening.max_experience} yrs`;
}

export function publicJobPath(opening: PublicOpening) {
  return `/jobs/${openingSlug(opening)}`;
}

export async function fetchPublicCareersForHost(host: string, proto = "https"): Promise<PublicCareersPage> {
  const base = publicCareersServerAPIBase(host, proto);
  const url = `${base}/hrms/public/careers?host=${encodeURIComponent(host)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) throw new PublicCareersFetchError("Tenant career site not found.", 404);
  if (!response.ok) throw new Error(`Unable to load tenant career site: ${response.status}`);
  return response.json() as Promise<PublicCareersPage>;
}

function publicCareersServerAPIBase(host: string, proto: string) {
  const configured = (process.env.INTERNAL_API_URL || process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  const normalizedHost = host.split(":")[0]?.toLowerCase() || "";
  if (normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
    return `${proto}://${host}`;
  }
  return "http://backend:8086";
}

export class PublicCareersFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicCareersFetchError";
    this.status = status;
  }
}

export function careerMetadata(page: PublicCareersPage, path = "/"): Metadata {
  const title = page.content.seo_title || `${page.tenant.display_name} Careers`;
  const description = page.content.seo_description || page.content.welcome_message || page.content.about;
  const logo = logoSrc(page.branding?.logo_path);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      images: logo ? [logo] : undefined,
      type: "website",
    },
  };
}

export function jobMetadata(page: PublicCareersPage, opening: PublicOpening, path: string): Metadata {
  const title = `${openingTitle(opening)} | ${page.tenant.display_name} Careers`;
  const description = opening.job_summary || stripText(opening.description || page.content.about).slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "article" },
  };
}

export function jobPostingJsonLd(page: PublicCareersPage, opening: PublicOpening, absoluteURL: string) {
  const employmentType = employmentTypeForSchema(opening.employment_type_name);
  const json: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: openingTitle(opening),
    description: stripText(opening.description || opening.job_summary || ""),
    identifier: {
      "@type": "PropertyValue",
      name: page.tenant.display_name,
      value: opening.code || opening.id,
    },
    datePosted: dateOnly(opening.publish_date || opening.created_at),
    hiringOrganization: {
      "@type": "Organization",
      name: page.tenant.display_name,
      logo: logoSrc(page.branding?.logo_path) || undefined,
      sameAs: absoluteURL.split("/jobs/")[0],
    },
    directApply: true,
    url: absoluteURL,
  };
  if (opening.expiry_date) json.validThrough = opening.expiry_date;
  if (employmentType) json.employmentType = employmentType;
  if ((opening.work_mode || "").toLowerCase() === "remote") {
    json.jobLocationType = "TELECOMMUTE";
    json.applicantLocationRequirements = { "@type": "Country", name: "India" };
  } else {
    json.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressCountry: "IN" },
    };
  }
  if (opening.is_salary_visible && opening.min_salary != null && opening.max_salary != null) {
    json.baseSalary = {
      "@type": "MonetaryAmount",
      currency: opening.salary_currency || "INR",
      value: {
        "@type": "QuantitativeValue",
        minValue: opening.min_salary,
        maxValue: opening.max_salary,
        unitText: (opening.salary_period || "year").toUpperCase(),
      },
    };
  }
  return json;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "job";
}

function stripText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function dateOnly(value?: string | null) {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function employmentTypeForSchema(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("full")) return "FULL_TIME";
  if (normalized.includes("part")) return "PART_TIME";
  if (normalized.includes("contract")) return "CONTRACTOR";
  if (normalized.includes("intern")) return "INTERN";
  if (normalized.includes("temporary")) return "TEMPORARY";
  return undefined;
}
