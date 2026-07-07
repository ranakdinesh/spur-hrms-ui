"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/SiteChrome";
import { apiRequest } from "@/lib/api";
import { storeAuthSession } from "@/lib/auth";

type VerifyResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  default_module?: string;
  tenant_url?: string;
  message?: string;
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailShell message="Loading verification..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const signupToken = searchParams.get("signup_token");
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState("");

  useEffect(() => {
    const activeToken = signupToken || token;
    if (!activeToken) {
      return;
    }

    const path = signupToken
      ? `/signup/verify?token=${encodeURIComponent(signupToken)}`
      : `/auth/email/verify?token=${encodeURIComponent(token || "")}`;

    apiRequest<VerifyResponse>(path, { method: "GET" })
      .then((response) => {
        storeAuthSession(response);
        setMessage(response.message || "Email verified successfully. Redirecting to dashboard...");
        window.setTimeout(() => {
          window.location.href = response.default_module || "/dashboard";
        }, 1000);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to verify email.");
        setMessage("");
      });
  }, [signupToken, token]);

  const displayError = token || signupToken ? error : "Verification token is missing.";
  const displayMessage = token || signupToken ? message : "";

  return (
    <VerifyEmailShell message={displayMessage} error={displayError} />
  );
}

function VerifyEmailShell({ message, error = "" }: { message: string; error?: string }) {
  return (
    <PageShell>
      <section className="bg-[#f4fbf8] px-4 py-20">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <h1 className="mb-3 text-3xl font-bold text-[#588368]">Email Verification</h1>
          {message ? <p className="text-[#6b7280]">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </div>
      </section>
    </PageShell>
  );
}
