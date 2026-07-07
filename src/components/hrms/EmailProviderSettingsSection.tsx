"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type EmailProviderSettings = {
  id?: string;
  tenant_id?: string;
  provider: "local" | "smtp" | "sendgrid" | string;
  is_enabled: boolean;
  from_name?: string | null;
  from_email: string;
  reply_to_email?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_username?: string | null;
  smtp_encryption?: string | null;
  sendgrid_sandbox_mode: boolean;
  spf_status?: string | null;
  dkim_status?: string | null;
  dmarc_status?: string | null;
  last_test_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  has_smtp_password?: boolean;
  has_sendgrid_api_key?: boolean;
  has_webhook_secret?: boolean;
  deliverability_hints?: string[];
};

type EmailProviderForm = {
  provider: "local" | "smtp" | "sendgrid";
  is_enabled: boolean;
  from_name: string;
  from_email: string;
  reply_to_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: "none" | "starttls" | "tls";
  sendgrid_api_key: string;
  sendgrid_sandbox_mode: boolean;
  webhook_signing_secret: string;
  spf_status: string;
  dkim_status: string;
  dmarc_status: string;
};

type TestForm = {
  to_email: string;
  subject: string;
  message: string;
};

const emptyForm: EmailProviderForm = {
  provider: "smtp",
  is_enabled: false,
  from_name: "",
  from_email: "",
  reply_to_email: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_username: "",
  smtp_password: "",
  smtp_encryption: "starttls",
  sendgrid_api_key: "",
  sendgrid_sandbox_mode: false,
  webhook_signing_secret: "",
  spf_status: "not_configured",
  dkim_status: "not_configured",
  dmarc_status: "not_configured",
};

const defaultTestForm: TestForm = {
  to_email: "",
  subject: "HRMS email provider test",
  message: "This test confirms that this tenant email provider can send transactional HRMS emails.",
};

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function settingsToForm(settings: EmailProviderSettings): EmailProviderForm {
  return {
    provider: settings.provider === "sendgrid" || settings.provider === "local" ? settings.provider : "smtp",
    is_enabled: settings.is_enabled,
    from_name: settings.from_name || "",
    from_email: settings.from_email || "",
    reply_to_email: settings.reply_to_email || "",
    smtp_host: settings.smtp_host || "",
    smtp_port: settings.smtp_port ? String(settings.smtp_port) : "587",
    smtp_username: settings.smtp_username || "",
    smtp_password: "",
    smtp_encryption: settings.smtp_encryption === "none" || settings.smtp_encryption === "tls" ? settings.smtp_encryption : "starttls",
    sendgrid_api_key: "",
    sendgrid_sandbox_mode: Boolean(settings.sendgrid_sandbox_mode),
    webhook_signing_secret: "",
    spf_status: settings.spf_status || "not_configured",
    dkim_status: settings.dkim_status || "not_configured",
    dmarc_status: settings.dmarc_status || "not_configured",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function healthClass(status?: string | null) {
  if (status === "verified" || status === "passed" || status === "sent") return "bg-[#ecfdf3] text-[#047857]";
  if (status === "failed" || status === "missing") return "bg-[#fff1f2] text-[#b91c1c]";
  return "bg-[#f8faf9] text-[#6b7280]";
}

export function EmailProviderSettingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const filteredTenants = useMemo(() => tenants.filter((tenant) => tenant.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Email Providers</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage SMTP, SendGrid, sender identity, and delivery testing.</p>
        </div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Provider</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  return <EmailProviderSettingsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function EmailProviderSettingsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [settings, setSettings] = useState<EmailProviderSettings | null>(null);
  const [form, setForm] = useState<EmailProviderForm>(emptyForm);
  const [testForm, setTestForm] = useState<TestForm>(defaultTestForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const row = await apiRequest<EmailProviderSettings>(`${basePath}/email-provider-settings`);
      setSettings(row);
      setForm(settingsToForm(row));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setSettings(null);
        setForm(emptyForm);
        setMessage("No email provider is configured yet.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load email provider settings.");
      }
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSettings(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        provider: form.provider,
        is_enabled: form.is_enabled,
        from_name: optionalString(form.from_name),
        from_email: form.from_email.trim(),
        reply_to_email: optionalString(form.reply_to_email),
        smtp_host: optionalString(form.smtp_host),
        smtp_port: optionalString(form.smtp_port) ? Number(form.smtp_port) : undefined,
        smtp_username: optionalString(form.smtp_username),
        smtp_password: optionalString(form.smtp_password),
        smtp_encryption: form.smtp_encryption,
        sendgrid_api_key: optionalString(form.sendgrid_api_key),
        sendgrid_sandbox_mode: form.sendgrid_sandbox_mode,
        webhook_signing_secret: optionalString(form.webhook_signing_secret),
        spf_status: optionalString(form.spf_status),
        dkim_status: optionalString(form.dkim_status),
        dmarc_status: optionalString(form.dmarc_status),
      };
      const saved = await apiRequest<EmailProviderSettings>(`${basePath}/email-provider-settings`, { method: "PUT", body: payload });
      setSettings(saved);
      setForm(settingsToForm(saved));
      setMessage("Email provider settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save email provider settings.");
    } finally {
      setSaving(false);
    }
  }

  async function testProvider() {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const tested = await apiRequest<EmailProviderSettings>(`${basePath}/email-provider-settings/test`, { method: "POST", body: { to_email: testForm.to_email.trim(), subject: testForm.subject.trim(), message: testForm.message.trim() } });
      setSettings(tested);
      setForm(settingsToForm(tested));
      setMessage("Test email request completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email.");
    } finally {
      setTesting(false);
    }
  }

  async function deleteSettings() {
    if (!settings?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/email-provider-settings/${settings.id}`, { method: "DELETE" });
      setSettings(null);
      setForm(emptyForm);
      setMessage("Email provider settings removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove email provider settings.");
    } finally {
      setSaving(false);
    }
  }

  const providerTitle = form.provider === "sendgrid" ? "SendGrid" : form.provider === "local" ? "Local Console" : "SMTP";
  const hints = settings?.deliverability_hints || [];

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Email Provider` : "Email Provider"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure tenant-specific transactional email delivery for notifications, onboarding, payroll, and future HR automations.</p>
        </div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>

      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {message ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#047857]">{message}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6 rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-black text-[#111827]">{providerTitle} Settings</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading configuration..." : settings?.id ? "Saved provider configuration" : "New provider configuration"}</p></div>
            <label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.is_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} type="checkbox" /> Enabled</label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#374151]">Provider<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as EmailProviderForm["provider"] }))}><option value="smtp">SMTP</option><option value="sendgrid">SendGrid</option><option value="local">Local console</option></select></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">From email<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, from_email: event.target.value }))} placeholder="hr@example.com" value={form.from_email} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">From name<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, from_name: event.target.value }))} placeholder="Setika HR" value={form.from_name} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Reply-to email<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, reply_to_email: event.target.value }))} placeholder="support@example.com" value={form.reply_to_email} /></label>
          </div>

          {form.provider === "smtp" ? (
            <div className="grid gap-4 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-[#374151]">SMTP host<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, smtp_host: event.target.value }))} placeholder="smtp.example.com" value={form.smtp_host} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">SMTP port<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, smtp_port: event.target.value }))} value={form.smtp_port} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Username<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, smtp_username: event.target.value }))} value={form.smtp_username} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Password<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, smtp_password: event.target.value }))} placeholder={settings?.has_smtp_password ? "Existing password kept" : ""} type="password" value={form.smtp_password} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Encryption<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form.smtp_encryption} onChange={(event) => setForm((current) => ({ ...current, smtp_encryption: event.target.value as EmailProviderForm["smtp_encryption"] }))}><option value="starttls">STARTTLS</option><option value="tls">TLS</option><option value="none">None</option></select></label>
            </div>
          ) : null}

          {form.provider === "sendgrid" ? (
            <div className="grid gap-4 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-[#374151]">SendGrid API key<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sendgrid_api_key: event.target.value }))} placeholder={settings?.has_sendgrid_api_key ? "Existing key kept" : ""} type="password" value={form.sendgrid_api_key} /></label>
              <label className="flex items-center gap-3 self-end rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.sendgrid_sandbox_mode} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sendgrid_sandbox_mode: event.target.checked }))} type="checkbox" /> Sandbox mode</label>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-4">
            {["spf_status", "dkim_status", "dmarc_status"].map((key) => (
              <label className="space-y-2 text-sm font-bold text-[#374151]" key={key}>{key.replace("_status", "").toUpperCase()}<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form[key as keyof EmailProviderForm] as string} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}><option value="not_configured">Not configured</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="failed">Failed</option></select></label>
            ))}
            <label className="space-y-2 text-sm font-bold text-[#374151]">Webhook secret<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, webhook_signing_secret: event.target.value }))} placeholder={settings?.has_webhook_secret ? "Existing secret kept" : ""} type="password" value={form.webhook_signing_secret} /></label>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {settings?.id ? <button className="rounded-xl border border-[#fca5a5] px-5 py-3 text-sm font-black text-[#b91c1c]" disabled={saving} onClick={deleteSettings} type="button">Remove</button> : null}
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveSettings} type="button">{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Provider Health</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["spf_status", "dkim_status", "dmarc_status"].map((key) => <span className={`rounded-xl px-3 py-2 text-center text-xs font-black ${healthClass(settings?.[key as keyof EmailProviderSettings] as string | undefined)}`} key={key}>{key.replace("_status", "").toUpperCase()}<br />{(settings?.[key as keyof EmailProviderSettings] as string | undefined) || "unknown"}</span>)}
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Last test</dt><dd className="text-right font-black text-[#111827]">{formatDateTime(settings?.last_test_at)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Status</dt><dd className="text-right font-black text-[#111827]">{settings?.last_test_status || "-"}</dd></div>
            </dl>
            {settings?.last_test_message ? <p className="mt-4 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold leading-5 text-[#4b5563]">{settings.last_test_message}</p> : null}
            {hints.length ? <ul className="mt-4 space-y-2 text-xs font-semibold leading-5 text-[#6b7280]">{hints.map((hint) => <li className="rounded-xl bg-[#f8faf9] px-3 py-2" key={hint}>{hint}</li>)}</ul> : null}
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Send Test</h2>
            <div className="mt-4 space-y-3">
              <input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, to_email: event.target.value }))} placeholder="recipient@example.com" value={testForm.to_email} />
              <input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, subject: event.target.value }))} value={testForm.subject} />
              <textarea className="min-h-28 w-full rounded-xl border border-[#dbe0e5] px-3 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, message: event.target.value }))} value={testForm.message} />
              <button className="w-full rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1f2937] disabled:opacity-60" disabled={testing || !settings?.id} onClick={testProvider} type="button">{testing ? "Sending..." : "Send Test Email"}</button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
