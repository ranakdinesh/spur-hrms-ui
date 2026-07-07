"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type PushSettings = {
  id?: string;
  provider: "local" | "fcm" | string;
  is_enabled: boolean;
  project_id?: string | null;
  client_email?: string | null;
  private_key_id?: string | null;
  auth_uri?: string | null;
  token_uri?: string | null;
  android_enabled: boolean;
  ios_enabled: boolean;
  web_enabled: boolean;
  default_click_action?: string | null;
  default_image_url?: string | null;
  ttl_seconds: number;
  collapse_key?: string | null;
  last_test_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  has_private_key?: boolean;
  readiness_hints?: string[];
};

type FormState = {
  provider: "local" | "fcm";
  is_enabled: boolean;
  project_id: string;
  client_email: string;
  private_key: string;
  private_key_id: string;
  token_uri: string;
  android_enabled: boolean;
  ios_enabled: boolean;
  web_enabled: boolean;
  default_click_action: string;
  default_image_url: string;
  ttl_seconds: string;
  collapse_key: string;
};

const emptyForm: FormState = {
  provider: "local",
  is_enabled: false,
  project_id: "",
  client_email: "",
  private_key: "",
  private_key_id: "",
  token_uri: "https://oauth2.googleapis.com/token",
  android_enabled: true,
  ios_enabled: true,
  web_enabled: false,
  default_click_action: "",
  default_image_url: "",
  ttl_seconds: "3600",
  collapse_key: "",
};

const defaultTest = { token: "", title: "HRMS push test", message: "This confirms push notifications are working." };

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function settingsToForm(settings: PushSettings): FormState {
  return {
    provider: settings.provider === "fcm" ? "fcm" : "local",
    is_enabled: Boolean(settings.is_enabled),
    project_id: settings.project_id || "",
    client_email: settings.client_email || "",
    private_key: "",
    private_key_id: settings.private_key_id || "",
    token_uri: settings.token_uri || "https://oauth2.googleapis.com/token",
    android_enabled: Boolean(settings.android_enabled),
    ios_enabled: Boolean(settings.ios_enabled),
    web_enabled: Boolean(settings.web_enabled),
    default_click_action: settings.default_click_action || "",
    default_image_url: settings.default_image_url || "",
    ttl_seconds: String(settings.ttl_seconds || 3600),
    collapse_key: settings.collapse_key || "",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function PushProviderSettingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const filteredTenants = useMemo(() => tenants.filter((tenant) => tenant.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Push Providers</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to configure Flutter push delivery through local mode or Firebase FCM.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Push</button></td></tr>)}</tbody></table></div>
        </section>
      </main>
    );
  }

  return <PushProviderManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function PushProviderManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [testForm, setTestForm] = useState(defaultTest);
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
      const row = await apiRequest<PushSettings>(`${basePath}/push-provider-settings`);
      setSettings(row);
      setForm(settingsToForm(row));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setSettings(null);
        setForm(emptyForm);
        setMessage("No push provider is configured yet.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load push settings.");
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
        project_id: optionalString(form.project_id),
        client_email: optionalString(form.client_email),
        private_key: optionalString(form.private_key),
        private_key_id: optionalString(form.private_key_id),
        token_uri: optionalString(form.token_uri),
        android_enabled: form.android_enabled,
        ios_enabled: form.ios_enabled,
        web_enabled: form.web_enabled,
        default_click_action: optionalString(form.default_click_action),
        default_image_url: optionalString(form.default_image_url),
        ttl_seconds: Number(form.ttl_seconds) || 3600,
        collapse_key: optionalString(form.collapse_key),
      };
      const saved = await apiRequest<PushSettings>(`${basePath}/push-provider-settings`, { method: "PUT", body: payload });
      setSettings(saved);
      setForm(settingsToForm(saved));
      setMessage("Push settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save push settings.");
    } finally {
      setSaving(false);
    }
  }

  async function testPush() {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const tested = await apiRequest<PushSettings>(`${basePath}/push-provider-settings/test`, { method: "POST", body: { token: testForm.token.trim(), title: testForm.title.trim(), message: testForm.message.trim() } });
      setSettings(tested);
      setForm(settingsToForm(tested));
      setMessage("Push test completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test push provider.");
    } finally {
      setTesting(false);
    }
  }

  async function removeSettings() {
    if (!settings?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/push-provider-settings/${settings.id}`, { method: "DELETE" });
      setSettings(null);
      setForm(emptyForm);
      setMessage("Push settings removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove push settings.");
    } finally {
      setSaving(false);
    }
  }

  const hints = settings?.readiness_hints || [];

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Push Provider` : "Push Providers"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure Flutter push delivery while HRMS keeps targeting, preferences, audit logs, and device-token registration.</p></div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {message ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#047857]">{message}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Provider Settings</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : form.is_enabled ? "Push delivery is enabled" : "Push delivery is disabled"}</p></div><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.is_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} type="checkbox" /> Enabled</label></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#374151]">Provider<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as FormState["provider"] }))}><option value="local">Local development</option><option value="fcm">Firebase FCM</option></select></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Project ID<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} value={form.project_id} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151] md:col-span-2">Client email<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, client_email: event.target.value }))} value={form.client_email} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Private key ID<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, private_key_id: event.target.value }))} value={form.private_key_id} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Token URI<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, token_uri: event.target.value }))} value={form.token_uri} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151] md:col-span-2">Private key<textarea className="min-h-28 w-full rounded-xl border border-[#dbe0e5] px-3 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, private_key: event.target.value }))} placeholder={settings?.has_private_key ? "Existing private key kept" : "-----BEGIN PRIVATE KEY-----"} value={form.private_key} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">TTL seconds<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, ttl_seconds: event.target.value }))} value={form.ttl_seconds} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Collapse key<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, collapse_key: event.target.value }))} value={form.collapse_key} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Click action<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, default_click_action: event.target.value }))} value={form.default_click_action} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Image URL<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, default_image_url: event.target.value }))} value={form.default_image_url} /></label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.android_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, android_enabled: event.target.checked }))} type="checkbox" /> Android</label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.ios_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, ios_enabled: event.target.checked }))} type="checkbox" /> iOS</label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.web_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, web_enabled: event.target.checked }))} type="checkbox" /> Web push</label>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {settings?.id ? <button className="rounded-xl border border-[#fca5a5] px-5 py-3 text-sm font-black text-[#b91c1c]" disabled={saving} onClick={removeSettings} type="button">Remove</button> : null}
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveSettings} type="button">{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Push Status</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Provider</dt><dd className="font-black uppercase text-[#111827]">{form.provider}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">State</dt><dd className={form.is_enabled ? "font-black text-[#047857]" : "font-black text-[#c2410c]"}>{form.is_enabled ? "Enabled" : "Disabled"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Last test</dt><dd className="text-right font-black text-[#111827]">{formatDateTime(settings?.last_test_at)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Result</dt><dd className="text-right font-black text-[#111827]">{settings?.last_test_status || "-"}</dd></div>
            </dl>
            {settings?.last_test_message ? <p className="mt-4 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold leading-5 text-[#4b5563]">{settings.last_test_message}</p> : null}
            {hints.length ? <ul className="mt-4 space-y-2 text-xs font-semibold leading-5 text-[#6b7280]">{hints.map((hint) => <li className="rounded-xl bg-[#f8faf9] px-3 py-2" key={hint}>{hint}</li>)}</ul> : null}
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Send Test</h2>
            <div className="mt-4 space-y-3">
              <input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, token: event.target.value }))} placeholder="Flutter FCM registration token" value={testForm.token} />
              <input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, title: event.target.value }))} value={testForm.title} />
              <textarea className="min-h-24 w-full rounded-xl border border-[#dbe0e5] px-3 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, message: event.target.value }))} value={testForm.message} />
              <button className="w-full rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1f2937] disabled:opacity-60" disabled={testing || !settings?.id} onClick={testPush} type="button">{testing ? "Sending..." : "Send Test Push"}</button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
