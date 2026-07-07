import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { PublicCareerSite } from "@/components/public/PublicCareerSite";
import { careerMetadata, fetchPublicCareersForHost, PublicCareersFetchError, type PublicCareersPage } from "@/lib/public-careers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await fetchPublicCareersForHost(await currentHost(), await currentProto());
    return careerMetadata(page, "/careers");
  } catch (err) {
    if (err instanceof PublicCareersFetchError && err.status === 404) return {};
    throw err;
  }
}

export default async function CareersPage() {
  let page: PublicCareersPage;
  try {
    page = await fetchPublicCareersForHost(await currentHost(), await currentProto());
  } catch (err) {
    if (err instanceof PublicCareersFetchError && err.status === 404) notFound();
    throw err;
  }
  return <PublicCareerSite page={page} />;
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
