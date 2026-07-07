"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type CommunicationSettings = {
  id?: string;
  tenant_id?: string;
  sms_provider: "local" | "msg91" | string;
  sms_enabled: boolean;
  sms_sender_id?: string | null;
  sms_template_id?: string | null;
  sms_route?: string | null;
  sms_country_code?: string | null;
  sms_base_url?: string | null;
  whatsapp_provider: "local" | "msg91" | "gupshup" | string;
  whatsapp_enabled: boolean;
  whatsapp_app_name?: string | null;
  whatsapp_source_number?: string | null;
  whatsapp_template_id?: string | null;
  whatsapp_template_name?: string | null;
  whatsapp_namespace?: string | null;
  whatsapp_base_url?: string | null;
  sms_last_test_at?: string | null;
  sms_last_test_status?: string | null;
  sms_last_test_message?: string | null;
  whatsapp_last_test_at?: string | null;
  whatsapp_last_test_status?: string | null;
  whatsapp_last_test_message?: string | null;
  has_sms_auth_key?: boolean;
  has_whatsapp_auth_key?: boolean;
  has_webhook_secret?: boolean;
  readiness_hints?: string[];
};

type FormState = {
  sms_provider: "local" | "msg91";
  sms_enabled: boolean;
  sms_sender_id: string;
  sms_auth_key: string;
  sms_template_id: string;
  sms_route: string;
  sms_country_code: string;
  sms_base_url: string;
  whatsapp_provider: "local" | "msg91" | "gupshup";
  whatsapp_enabled: boolean;
  whatsapp_auth_key: string;
  whatsapp_app_name: string;
  whatsapp_source_number: string;
  whatsapp_template_id: string;
  whatsapp_template_name: string;
  whatsapp_namespace: string;
  whatsapp_base_url: string;
  webhook_signing_secret: string;
};

const emptyForm: FormState = {
  sms_provider: "local",
  sms_enabled: false,
  sms_sender_id: "",
  sms_auth_key: "",
  sms_template_id: "",
  sms_route: "",
  sms_country_code: "",
  sms_base_url: "",
  whatsapp_provider: "local",
  whatsapp_enabled: false,
  whatsapp_auth_key: "",
  whatsapp_app_name: "",
  whatsapp_source_number: "",
  whatsapp_template_id: "",
  whatsapp_template_name: "",
  whatsapp_namespace: "",
  whatsapp_base_url: "",
  webhook_signing_secret: "",
};

const testDefaults = { channel: "sms", to_phone: "", message: "HRMS SMS and WhatsApp provider test." };

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function settingsToForm(settings: CommunicationSettings): FormState {
  return {
    sms_provider: settings.sms_provider === "msg91" ? "msg91" : "local",
    sms_enabled: Boolean(settings.sms_enabled),
    sms_sender_id: settings.sms_sender_id || "",
    sms_auth_key: "",
    sms_template_id: settings.sms_template_id || "",
    sms_route: settings.sms_route || "",
    sms_country_code: settings.sms_country_code || "",
    sms_base_url: settings.sms_base_url || "",
    whatsapp_provider: settings.whatsapp_provider === "msg91" || settings.whatsapp_provider === "gupshup" ? settings.whatsapp_provider : "local",
    whatsapp_enabled: Boolean(settings.whatsapp_enabled),
    whatsapp_auth_key: "",
    whatsapp_app_name: settings.whatsapp_app_name || "",
    whatsapp_source_number: settings.whatsapp_source_number || "",
    whatsapp_template_id: settings.whatsapp_template_id || "",
    whatsapp_template_name: settings.whatsapp_template_name || "",
    whatsapp_namespace: settings.whatsapp_namespace || "",
    whatsapp_base_url: settings.whatsapp_base_url || "",
    webhook_signing_secret: "",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusClass(status?: string | null) {
  if (status === "Sent") return "bg-[#ecfdf3] text-[#047857]";
  if (status === "Failed") return "bg-[#fff1f2] text-[#b91c1c]";
  return "bg-[#f8faf9] text-[#6b7280]";
}

export function CommunicationProviderSettingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const filteredTenants = useMemo(() => tenants.filter((tenant) => tenant.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">SMS & WhatsApp</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to enable or disable SMS and WhatsApp provider settings.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Settings</button></td></tr>)}</tbody></table></div>
        </section>
      </main>
    );
  }

  return <CommunicationProviderManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function CommunicationProviderManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [settings, setSettings] = useState<CommunicationSettings | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [testForm, setTestForm] = useState(testDefaults);
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
      const row = await apiRequest<CommunicationSettings>(`${basePath}/communication-provider-settings`);
      setSettings(row);
      setForm(settingsToForm(row));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SMS and WhatsApp settings.");
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
        sms_provider: form.sms_provider,
        sms_enabled: form.sms_enabled,
        sms_sender_id: optionalString(form.sms_sender_id),
        sms_auth_key: optionalString(form.sms_auth_key),
        sms_template_id: optionalString(form.sms_template_id),
        sms_route: optionalString(form.sms_route),
        sms_country_code: optionalString(form.sms_country_code),
        sms_base_url: optionalString(form.sms_base_url),
        whatsapp_provider: form.whatsapp_provider,
        whatsapp_enabled: form.whatsapp_enabled,
        whatsapp_auth_key: optionalString(form.whatsapp_auth_key),
        whatsapp_app_name: optionalString(form.whatsapp_app_name),
        whatsapp_source_number: optionalString(form.whatsapp_source_number),
        whatsapp_template_id: optionalString(form.whatsapp_template_id),
        whatsapp_template_name: optionalString(form.whatsapp_template_name),
        whatsapp_namespace: optionalString(form.whatsapp_namespace),
        whatsapp_base_url: optionalString(form.whatsapp_base_url),
        webhook_signing_secret: optionalString(form.webhook_signing_secret),
      };
      const saved = await apiRequest<CommunicationSettings>(`${basePath}/communication-provider-settings`, { method: "PUT", body: payload });
      setSettings(saved);
      setForm(settingsToForm(saved));
      setMessage("SMS and WhatsApp settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SMS and WhatsApp settings.");
    } finally {
      setSaving(false);
    }
  }

  async function testProvider() {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const tested = await apiRequest<CommunicationSettings>(`${basePath}/communication-provider-settings/test`, { method: "POST", body: { channel: testForm.channel, to_phone: testForm.to_phone.trim(), message: testForm.message.trim() } });
      setSettings(tested);
      setForm(settingsToForm(tested));
      setMessage("Test request completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send provider test.");
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
      await apiRequest(`${basePath}/communication-provider-settings/${settings.id}`, { method: "DELETE" });
      setSettings(null);
      setForm(emptyForm);
      setMessage("SMS and WhatsApp settings removed. Both channels are disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove SMS and WhatsApp settings.");
    } finally {
      setSaving(false);
    }
  }

  const hints = settings?.readiness_hints || [];

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} SMS & WhatsApp` : "SMS & WhatsApp"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Control tenant opt-in for SMS and WhatsApp delivery. Both channels stay disabled until explicitly enabled.</p></div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {message ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#047857]">{message}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-[#111827]">SMS Settings</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : form.sms_enabled ? "SMS delivery is enabled" : "SMS delivery is disabled"}</p></div><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.sms_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_enabled: event.target.checked }))} type="checkbox" /> Enable SMS</label></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-[#374151]">Provider<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form.sms_provider} onChange={(event) => setForm((current) => ({ ...current, sms_provider: event.target.value as FormState["sms_provider"] }))}><option value="local">Local console</option><option value="msg91">MSG91</option></select></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Sender ID<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_sender_id: event.target.value }))} value={form.sms_sender_id} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Auth key<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_auth_key: event.target.value }))} placeholder={settings?.has_sms_auth_key ? "Existing key kept" : ""} type="password" value={form.sms_auth_key} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Template ID<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_template_id: event.target.value }))} value={form.sms_template_id} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Route<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_route: event.target.value }))} value={form.sms_route} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Country code<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_country_code: event.target.value }))} value={form.sms_country_code} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151] md:col-span-2">Base URL<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, sms_base_url: event.target.value }))} placeholder="Provider default is used when blank" value={form.sms_base_url} /></label>
            </div>
          </div>

          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-[#111827]">WhatsApp Settings</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{form.whatsapp_enabled ? "WhatsApp delivery is enabled" : "WhatsApp delivery is disabled"}</p></div><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.whatsapp_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_enabled: event.target.checked }))} type="checkbox" /> Enable WhatsApp</label></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-[#374151]">Provider<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form.whatsapp_provider} onChange={(event) => setForm((current) => ({ ...current, whatsapp_provider: event.target.value as FormState["whatsapp_provider"] }))}><option value="local">Local console</option><option value="msg91">MSG91</option><option value="gupshup">Gupshup</option></select></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Auth key<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_auth_key: event.target.value }))} placeholder={settings?.has_whatsapp_auth_key ? "Existing key kept" : ""} type="password" value={form.whatsapp_auth_key} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">App name<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_app_name: event.target.value }))} value={form.whatsapp_app_name} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Source number<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_source_number: event.target.value }))} value={form.whatsapp_source_number} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Template ID<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_template_id: event.target.value }))} value={form.whatsapp_template_id} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Template name<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_template_name: event.target.value }))} value={form.whatsapp_template_name} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Namespace<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_namespace: event.target.value }))} value={form.whatsapp_namespace} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151]">Webhook secret<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, webhook_signing_secret: event.target.value }))} placeholder={settings?.has_webhook_secret ? "Existing secret kept" : ""} type="password" value={form.webhook_signing_secret} /></label>
              <label className="space-y-2 text-sm font-bold text-[#374151] md:col-span-2">Base URL<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, whatsapp_base_url: event.target.value }))} placeholder="Provider default is used when blank" value={form.whatsapp_base_url} /></label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {settings?.id ? <button className="rounded-xl border border-[#fca5a5] px-5 py-3 text-sm font-black text-[#b91c1c]" disabled={saving} onClick={removeSettings} type="button">Remove</button> : null}
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveSettings} type="button">{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Channel Status</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl bg-[#f8faf9] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-[#111827]">SMS</span><span className={`rounded-full px-3 py-1 text-xs font-black ${form.sms_enabled ? "bg-[#ecfdf3] text-[#047857]" : "bg-[#fff7ed] text-[#c2410c]"}`}>{form.sms_enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-xs font-semibold text-[#6b7280]">Last test: {formatDateTime(settings?.sms_last_test_at)}</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${statusClass(settings?.sms_last_test_status)}`}>{settings?.sms_last_test_status || "Not tested"}</span>{settings?.sms_last_test_message ? <p className="mt-2 text-xs font-semibold text-[#6b7280]">{settings.sms_last_test_message}</p> : null}</div>
              <div className="rounded-xl bg-[#f8faf9] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-[#111827]">WhatsApp</span><span className={`rounded-full px-3 py-1 text-xs font-black ${form.whatsapp_enabled ? "bg-[#ecfdf3] text-[#047857]" : "bg-[#fff7ed] text-[#c2410c]"}`}>{form.whatsapp_enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-xs font-semibold text-[#6b7280]">Last test: {formatDateTime(settings?.whatsapp_last_test_at)}</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${statusClass(settings?.whatsapp_last_test_status)}`}>{settings?.whatsapp_last_test_status || "Not tested"}</span>{settings?.whatsapp_last_test_message ? <p className="mt-2 text-xs font-semibold text-[#6b7280]">{settings.whatsapp_last_test_message}</p> : null}</div>
            </div>
            {hints.length ? <ul className="mt-4 space-y-2 text-xs font-semibold leading-5 text-[#6b7280]">{hints.map((hint) => <li className="rounded-xl bg-[#f8faf9] px-3 py-2" key={hint}>{hint}</li>)}</ul> : null}
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Send Test</h2>
            <div className="mt-4 space-y-3">
              <select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={testForm.channel} onChange={(event) => setTestForm((current) => ({ ...current, channel: event.target.value }))}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select>
              <input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, to_phone: event.target.value }))} placeholder="+919999999999" value={testForm.to_phone} />
              <textarea className="min-h-28 w-full rounded-xl border border-[#dbe0e5] px-3 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTestForm((current) => ({ ...current, message: event.target.value }))} value={testForm.message} />
              <button className="w-full rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1f2937] disabled:opacity-60" disabled={testing || !settings?.id} onClick={testProvider} type="button">{testing ? "Sending..." : "Send Test"}</button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
