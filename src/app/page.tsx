import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CTASection, FeaturesSection, HeroSection, PricingSection, StartupSection, StatsSection, TestimonialsSection } from "@/components/Sections";
import { PageShell } from "@/components/SiteChrome";
import { PublicCareerSite } from "@/components/public/PublicCareerSite";
import { careerMetadata, fetchPublicCareersForHost, PublicCareersFetchError, type PublicCareersPage } from "@/lib/public-careers";
import { isTenantHost } from "@/lib/tenant-domain";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const host = await currentHost();
  if (!isTenantHost(host)) {
    return { title: "Setika HRMS", description: "Setika HRMS" };
  }
  try {
    const page = await fetchPublicCareersForHost(host, await currentProto());
    return careerMetadata(page, "/");
  } catch (err) {
    if (err instanceof PublicCareersFetchError && err.status === 404) return {};
    throw err;
  }
}

export default async function Home() {
  const host = await currentHost();
  if (isTenantHost(host)) {
    let page: PublicCareersPage;
    try {
      page = await fetchPublicCareersForHost(host, await currentProto());
    } catch (err) {
      if (err instanceof PublicCareersFetchError && err.status === 404) notFound();
      throw err;
    }
    return <PublicCareerSite page={page} />;
  }
  return (
    <PageShell>
      <HeroSection />
      <StatsSection overlap />
      <FeaturesSection />
      <PricingSection />
      <StartupSection />
      <TestimonialsSection />
      <CTASection />
    </PageShell>
  );
}

async function currentHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") || headerList.get("host") || "";
}

async function currentProto() {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto");
  if (proto) return proto;
  const host = headerList.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
}
