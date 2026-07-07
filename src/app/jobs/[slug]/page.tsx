import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { PublicCareerSite } from "@/components/public/PublicCareerSite";
import {
  fetchPublicCareersForHost,
  findOpeningBySlug,
  jobMetadata,
  jobPostingJsonLd,
  PublicCareersFetchError,
  type PublicCareersPage,
  type PublicOpening,
} from "@/lib/public-careers";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const host = await currentHost();
    const page = await fetchPublicCareersForHost(host, await currentProto());
    const opening = findOpeningBySlug(page, slug);
    if (!opening) return {};
    return jobMetadata(page, opening, `/jobs/${slug}`);
  } catch (err) {
    if (err instanceof PublicCareersFetchError && err.status === 404) return {};
    throw err;
  }
}

export default async function JobPage({ params }: PageProps) {
  const { slug } = await params;
  let page: PublicCareersPage;
  let opening: PublicOpening;
  let absoluteURL: string;
  try {
    const host = await currentHost();
    const proto = await currentProto();
    page = await fetchPublicCareersForHost(host, proto);
    const matchedOpening = findOpeningBySlug(page, slug);
    if (!matchedOpening) notFound();
    opening = matchedOpening;
    absoluteURL = `${proto}://${host}/jobs/${slug}`;
  } catch (err) {
    if (err instanceof PublicCareersFetchError && err.status === 404) notFound();
    throw err;
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(page, opening, absoluteURL)) }} />
      <PublicCareerSite page={page} selectedOpening={opening} />
    </>
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
