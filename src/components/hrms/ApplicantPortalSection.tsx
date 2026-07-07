"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

type Candidate = {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Application = {
  id: string;
  job_posting_title?: string | null;
  job_posting_code?: string | null;
  status: string;
  applied_at: string;
  days_in_stage?: number;
  comments?: string | null;
};

type ApplicantPortal = {
  candidate?: Candidate | null;
  applications: Application[];
};

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("reject") || normalized.includes("withdraw")) return "bg-[#fff1f2] text-[#be123c] border-[#fecdd3]";
  if (normalized.includes("offer") || normalized.includes("hire")) return "bg-[#ecfdf5] text-[#047857] border-[#bbf7d0]";
  if (normalized.includes("interview")) return "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]";
  return "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]";
}

export function ApplicantPortalSection() {
  const [portal, setPortal] = useState<ApplicantPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiRequest<ApplicantPortal>("/hrms/applicant/me")
        .then((data) => {
          if (active) setPortal(data);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Unable to load applications.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return <section className="rounded-lg border border-[#dfe6e2] bg-white p-6 text-sm font-bold text-[#6b7280]">Loading applications...</section>;
  }

  if (error) {
    return <section className="rounded-lg border border-[#fecaca] bg-white p-6 text-sm font-bold text-[#b91c1c]">{error}</section>;
  }

  const candidate = portal?.candidate;
  const name = [candidate?.firstname, candidate?.lastname].filter(Boolean).join(" ").trim() || "Applicant";
  const applications = portal?.applications || [];

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#dfe6e2] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#588368]">My Applications</p>
            <h1 className="mt-2 text-2xl font-black text-[#111827]">{name}</h1>
            <p className="mt-1 text-sm font-semibold text-[#6b7280]">{candidate?.email || "Email not available"}{candidate?.phone ? ` · ${candidate.phone}` : ""}</p>
          </div>
          <div className="rounded-lg border border-[#e5ebe7] bg-[#f7faf8] px-4 py-3 text-right">
            <p className="text-2xl font-black text-[#111827]">{applications.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7280]">Submitted</p>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cbd5d1] bg-white p-8 text-center text-sm font-bold text-[#6b7280]">No applications found for this account.</div>
      ) : (
        <div className="grid gap-3">
          {applications.map((application) => (
            <article className="rounded-lg border border-[#dfe6e2] bg-white p-5 shadow-sm" key={application.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a978f]">{application.job_posting_code || "Opening"}</p>
                  <h2 className="mt-1 text-lg font-black text-[#111827]">{application.job_posting_title || "Job application"}</h2>
                  <p className="mt-2 text-sm font-semibold text-[#6b7280]">Applied {formatDate(application.applied_at)} · {application.days_in_stage || 0} days in current stage</p>
                </div>
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${statusClass(application.status)}`}>{application.status}</span>
              </div>
              {application.comments ? <p className="mt-4 rounded-lg bg-[#f8faf9] p-3 text-sm font-semibold leading-6 text-[#4b5563]">{application.comments}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
