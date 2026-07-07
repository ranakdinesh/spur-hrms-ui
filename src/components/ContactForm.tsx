"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { getTenantBaseDomain, tenantHost } from "@/lib/tenant-domain";
import { validateTenantSubdomain } from "@/lib/tenant-subdomain-validation";

type Status = "idle" | "submitting" | "success" | "error";

type SignupResponse = {
  message?: string;
  requires_email_verification?: boolean;
  subdomain?: string;
  tenant_url?: string;
  status?: string;
};

type SubdomainAvailabilityResponse = {
  subdomain: string;
  available: boolean;
  message: string;
};

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    try {
      await apiRequest("/contact-us", {
        method: "POST",
        body: payload,
      });
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)]" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First Name" name="firstName" required />
        <Field label="Last Name" name="lastName" />
        <Field label="Work Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" required />
        <Field label="Company" name="company" required />
        <Field label="Employees" name="employees" />
      </div>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[#111827]">Message</span>
        <textarea
          className="min-h-32 w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]"
          name="message"
          placeholder="Tell us what you need"
        />
      </label>
      <button className="mt-5 w-full rounded-lg bg-[#588368] px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Send Message"}
      </button>
      {status === "success" ? <p className="mt-3 text-sm font-semibold text-[#588368]">Message sent successfully.</p> : null}
      {status === "error" ? <p className="mt-3 text-sm font-semibold text-red-600">Unable to send right now. Please try again.</p> : null}
    </form>
  );
}

export function SignupModalButton({ children = "Sign-Up-Now" }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="inline-flex rounded-lg bg-[#588368] px-10 py-3 font-semibold text-white" onClick={() => setOpen(true)} type="button">
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true">
          <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#f4fbf8] p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#588368]">Start Your Free Trial</h2>
                <p className="mt-1 text-sm text-[#6b7280]">Verify your email first. We will create your HR workspace after verification.</p>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl text-[#588368]" onClick={() => setOpen(false)} type="button" aria-label="Close signup form">
                ×
              </button>
            </div>
            <SignupForm />
          </div>
        </div>
      ) : null}
    </>
  );
}

function SignupForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [workspacePreview, setWorkspacePreview] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [subdomainMessage, setSubdomainMessage] = useState("");
  const tenantBaseDomain = getTenantBaseDomain();

  async function checkSubdomainAvailability(value: string) {
    const workspace = value.trim().toLowerCase();
    const localError = validateTenantSubdomain(workspace);
    if (localError) {
      setSubdomainStatus("unavailable");
      setSubdomainMessage(localError);
      return false;
    }
    setSubdomainStatus("checking");
    setSubdomainMessage("Checking workspace address...");
    try {
      const result = await apiRequest<SubdomainAvailabilityResponse>(`/signup/subdomain-availability?subdomain=${encodeURIComponent(workspace)}`);
      setSubdomainStatus(result.available ? "available" : "unavailable");
      setSubdomainMessage(result.message);
      return result.available;
    } catch (err) {
      setSubdomainStatus("unavailable");
      setSubdomainMessage(err instanceof Error ? err.message : "Unable to check workspace address.");
      return false;
    }
  }

  useEffect(() => {
    const workspace = subdomain.trim().toLowerCase();
    if (!workspace) {
      return;
    }
    const timer = window.setTimeout(() => {
      void checkSubdomainAvailability(workspace);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [subdomain]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    setSuccessMessage("");
    setWorkspacePreview("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setStatus("error");
      setError("Password and confirm password must match.");
      return;
    }
    if (password.length < 12) {
      setStatus("error");
      setError("Password must be at least 12 characters.");
      return;
    }
    const workspace = subdomain.trim().toLowerCase();
    const subdomainAvailable = await checkSubdomainAvailability(workspace);
    if (!subdomainAvailable) {
      setStatus("error");
      setError("Choose an available workspace address before sending verification.");
      return;
    }

    const payload = {
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      email: data.get("email"),
      phone: data.get("phone"),
      company: data.get("company"),
      subdomain: workspace,
      password,
    };

    try {
      const response = await apiRequest<SignupResponse>("/signup", {
        method: "POST",
        body: payload,
      });
      setStatus("success");
      setSuccessMessage(response.message || "Check your email to verify your account. Your 30-day Setika trial starts after verification.");
      setWorkspacePreview(response.tenant_url || "");
      form.reset();
      setSubdomain("");
      setSubdomainStatus("idle");
      setSubdomainMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to create signup right now. Please try again.");
    }
  }

  return (
    <form className="rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(88,131,104,0.14)]" onSubmit={onSubmit}>
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-5 grid gap-2 sm:grid-cols-3">
            {["Account", "Email", "Trial"].map((item, index) => (
              <div className="rounded-xl border border-[#e2eadf] bg-[#fffaf4] px-3 py-2" key={item}>
                <span className="text-xs font-black uppercase tracking-wide text-[#588368]">Step {index + 1}</span>
                <p className="text-sm font-black text-[#172033]">{item}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" name="firstName" required />
            <Field label="Last Name" name="lastName" required />
            <Field label="Work Email" name="email" type="email" required />
            <Field label="Mobile" name="phone" type="tel" required />
            <Field label="Password" name="password" type="password" required />
            <Field label="Confirm Password" name="confirmPassword" type="password" required />
            <Field label="Company Name" name="company" required wrapperClassName="sm:col-span-2" />
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-[#111827]">Workspace Address</span>
              <div className="flex overflow-hidden rounded-lg border border-[#d1d5db] bg-white focus-within:border-[#588368]">
                <input
                  className="min-w-0 flex-1 px-4 py-3 lowercase outline-none"
                  name="subdomain"
                  onBlur={() => void checkSubdomainAvailability(subdomain)}
                  onChange={(event) => {
                    const next = event.target.value.trim().toLowerCase();
                    setSubdomain(next);
                    if (!next) {
                      setSubdomainStatus("idle");
                      setSubdomainMessage("");
                    }
                  }}
                  pattern="[a-z0-9-]+"
                  placeholder="yourcompany"
                  required
                  value={subdomain}
                />
                <span className="flex shrink-0 items-center border-l border-[#e5e7eb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#6b7280]">.{tenantBaseDomain}</span>
              </div>
              {subdomain ? <p className="mt-2 text-xs font-semibold text-[#6b7280]">Workspace URL: https://{tenantHost(subdomain, tenantBaseDomain)}</p> : null}
              {subdomainMessage ? (
                <p className={`mt-2 text-sm font-semibold ${subdomainStatus === "available" ? "text-[#588368]" : "text-red-600"}`}>
                  {subdomainStatus === "checking" ? "Checking workspace address..." : subdomainMessage}
                </p>
              ) : null}
            </label>
          </div>
        </div>
        <aside className="rounded-2xl border border-[#e2eadf] bg-[#f4fbf8] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#588368]">Trial setup</p>
          <h3 className="mt-2 text-xl font-black text-[#172033]">30 days, no card now</h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#6b7280]">We put new self-service tenants on a starter trial. Plans and billing can be finalized with the Setika team after setup.</p>
          <div className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-[#426b53]">
            Email verification is required before your workspace is created.
          </div>
        </aside>
      </div>
      <button className="mt-5 w-full rounded-xl bg-[#588368] px-6 py-3 font-black text-white shadow-[0_12px_28px_rgba(88,131,104,0.25)] transition hover:bg-[#426b53] disabled:opacity-60" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending verification..." : "Send Verification Email"}
      </button>
      {status === "success" ? (
        <div className="mt-4 rounded-xl border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#426b53]">
          <p>{successMessage}</p>
          {workspacePreview ? <p className="mt-1 text-xs text-[#6b7280]">Reserved workspace: {workspacePreview}</p> : null}
        </div>
      ) : null}
      {status === "error" && error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  wrapperClassName = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  wrapperClassName?: string;
}) {
  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="mb-2 block text-sm font-semibold text-[#111827]">
        {label}
        {!required ? <span className="ml-1 text-[#9ca3af]">(Optional)</span> : null}
      </span>
      <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}
