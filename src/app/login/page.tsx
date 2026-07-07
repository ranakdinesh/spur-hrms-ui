"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { useTenantBranding } from "@/lib/tenant-branding";
import { storeAuthSession } from "@/lib/auth";
import { asset } from "@/lib/site-data";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  legacy_password_migrated?: boolean;
  password_migration_required?: boolean;
  password_migration_message?: string;
};

function stringFromDetails(details: unknown, keys: string[]) {
  if (!details || typeof details !== "object") {
    return "";
  }
  const record = details as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function boolFromDetails(details: unknown, keys: string[]) {
  if (!details || typeof details !== "object") {
    return false;
  }
  const record = details as Record<string, unknown>;
  return keys.some((key) => record[key] === true);
}

function legacyPasswordMessageFromError(err: unknown) {
  if (!(err instanceof ApiRequestError)) {
    return "";
  }
  const message = stringFromDetails(err.details, ["password_migration_message", "migration_message", "message"]);
  const migrationRequired = boolFromDetails(err.details, ["password_migration_required", "legacy_password_migration_required"]);
  if (migrationRequired) {
    return message || "Your account uses a legacy password format. Reset your password or contact HR if automatic migration is not enabled.";
  }
  return message && message.toLowerCase().includes("legacy password") ? message : "";
}

export default function LoginPage() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "resending">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const { branding } = useTenantBranding();
  const logoSrc = branding.logo_path || asset("/assets/img/logo.png");
  const brandName = branding.display_name || "HRMS";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setVerificationRequired(false);
    setStatus("submitting");

    const data = new FormData(event.currentTarget);
    const loginIdentifier = String(data.get("identifier") || "").trim();
    const password = String(data.get("password") || "");
    const remember = data.get("remember") !== null;

    try {
      const response = await apiRequest<LoginResponse>("/setika/auth/login", {
        method: "POST",
        body: { identifier: loginIdentifier, password },
      });
      if (response.password_migration_required) {
        setStatus("idle");
        setError(response.password_migration_message || "Your account uses a legacy password format. Reset your password or contact HR if automatic migration is not enabled.");
        return;
      }
      storeAuthSession(response, { persist: remember });
      if (response.legacy_password_migrated || response.password_migration_message) {
        setStatus("idle");
        setMessage(response.password_migration_message || "Your password was upgraded to the current secure format. Redirecting...");
        window.setTimeout(() => window.location.assign("/dashboard"), 900);
        return;
      }
      window.location.assign("/dashboard");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to login right now.";
      const needsVerification = errorMessage === "email verification required";
      const migrationMessage = legacyPasswordMessageFromError(err);
      setVerificationRequired(needsVerification);
      setError(needsVerification ? "Please verify your email address before logging in." : migrationMessage || errorMessage);
      setStatus("idle");
    }
  }


  async function resendVerificationEmail() {
    const email = identifier.trim().toLowerCase();
    setError("");
    setMessage("");
    if (!email || !email.includes("@")) {
      setError("Enter your email address in the Email or Mobile field, then resend the verification email.");
      return;
    }
    setStatus("resending");
    try {
      await apiRequest<{ status: string }>("/auth/email/verification/resend", {
        method: "POST",
        body: { email },
      });
      setMessage("If this email belongs to an unverified account, a new verification link has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend verification email.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#111827]">
      <div className="grid min-h-screen min-w-0 lg:grid-cols-12">
        <section className="relative hidden min-h-screen items-center justify-center overflow-hidden bg-[#eef7f3] px-8 py-10 md:flex lg:col-span-5">
          <div className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />
          <div className="absolute -bottom-28 right-8 h-80 w-80 rounded-full bg-[#88b39a]/30 blur-3xl" />
          <div className="absolute right-10 top-10 h-36 w-36 rotate-12 rounded-[2rem] border border-[var(--brand-primary)]/20 bg-white/40" />
          <div className="absolute bottom-16 left-12 h-28 w-28 rounded-full border-[18px] border-[var(--brand-primary)]/15" />

          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-white/60 bg-[var(--brand-primary)] p-8 text-white shadow-2xl">
            <p className="mb-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">Secure HRMS access</p>
            <h1 className="text-4xl font-bold leading-tight xl:text-5xl">People operations, secured for every tenant.</h1>
            <div className="my-8 grid gap-3">
              {["Tenant aware access", "Email verified login", "Mobile or email sign in"].map((item) => (
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3" key={item}>
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-lg font-semibold leading-8 text-white/90">Login with a verified account and continue to your HRMS workspace.</p>
          </div>
        </section>

        <section className="flex min-h-screen w-full min-w-0 items-center justify-center bg-[linear-gradient(115deg,#ffffff_0%,#f4fbf8_100%)] px-4 py-8 sm:px-5 lg:col-span-7">
          <div className="flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-[calc(100vw-2rem)] flex-col justify-between sm:max-w-md">
            <div className="mb-10">
              <Link className="inline-flex" href="/" aria-label={`${brandName} home`}>
                <img alt={`${brandName} logo`} className="h-10 max-w-[190px] object-contain" src={logoSrc} />
              </Link>
            </div>

            <form className="w-full min-w-0 rounded-3xl border border-[#dbe8e1] bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)] sm:p-7" onSubmit={onSubmit}>
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-3xl font-bold text-[#111827]">Sign In</h2>
                <p className="text-sm text-[#6b7280]">Login using email and password or mobile and password.</p>
              </div>

              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Email or Mobile</span>
                <div className="relative">
                  <input
                    autoComplete="username"
                    className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-4 pr-11 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10"
                    name="identifier"
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="you@company.com or +91..."
                    required
                    type="text"
                    value={identifier}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">@</span>
                </div>
              </label>

              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Password</span>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-4 pr-16 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10"
                    name="password"
                    placeholder="Enter your password"
                    required
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--brand-primary)]"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-[#4b5563]">
                  <input className="h-4 w-4 rounded border-[#d1d5db] accent-[var(--brand-primary)]" defaultChecked name="remember" type="checkbox" />
                  Remember me
                </label>
                <a className="font-semibold text-[var(--brand-primary)]" href="/forgot-password">
                  Forgot Password?
                </a>
              </div>

              <button
                className="h-11 w-full rounded-lg bg-[var(--brand-primary)] font-semibold text-white shadow-[0_10px_24px_rgba(88,131,104,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === "submitting"}
                type="submit"
              >
                {status === "submitting" ? "Signing in..." : "Sign In"}
              </button>

              {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
              {message ? <p className="mt-4 rounded-lg border border-[#cfe8d9] bg-[#f0fbf4] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}
              {verificationRequired ? (
                <div className="mt-4 rounded-lg border border-[#dbe8e1] bg-[#f8faf9] p-4 text-sm text-[#4b5563]">
                  <p className="font-semibold text-[#111827]">Did not receive the verification email?</p>
                  <p className="mt-1">Use your email address above and request a fresh verification link.</p>
                  <button
                    className="mt-3 rounded-lg border border-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={status === "resending"}
                    onClick={resendVerificationEmail}
                    type="button"
                  >
                    {status === "resending" ? "Sending..." : "Resend verification email"}
                  </button>
                </div>
              ) : null}

              <p className="mt-6 text-center text-sm text-[#4b5563]">
                Don&apos;t have an account?{" "}
                <Link className="font-semibold text-[var(--brand-primary)]" href="/contact-us">
                  Create Account
                </Link>
              </p>
            </form>

            <p className="mt-8 text-center text-sm text-[#6b7280]">Powered by Setika</p>
          </div>
        </section>
      </div>
    </main>
  );
}
