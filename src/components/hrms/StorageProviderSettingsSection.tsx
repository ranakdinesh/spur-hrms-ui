"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type StorageSettings = {
  id?: string;
  provider: "s3" | "minio" | string;
  is_enabled: boolean;
  bucket: string;
  region?: string | null;
  endpoint?: string | null;
  use_ssl: boolean;
  force_path_style: boolean;
  object_prefix?: string | null;
  public_base_url?: string | null;
  max_file_size_bytes: number;
  allowed_content_types?: string | null;
  last_test_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  has_access_key_id?: boolean;
  has_secret_access_key?: boolean;
  readiness_hints?: string[];
};

type FormState = {
  provider: "minio" | "s3";
  is_enabled: boolean;
  bucket: string;
  region: string;
  endpoint: string;
  access_key_id: string;
  secret_access_key: string;
  use_ssl: boolean;
  force_path_style: boolean;
  object_prefix: string;
  public_base_url: string;
  max_file_size_bytes: string;
  allowed_content_types: string;
};

const emptyForm: FormState = {
  provider: "minio",
  is_enabled: false,
  bucket: "",
  region: "",
  endpoint: "localhost:9000",
  access_key_id: "",
  secret_access_key: "",
  use_ssl: false,
  force_path_style: true,
  object_prefix: "hrms",
  public_base_url: "",
  max_file_size_bytes: "10485760",
  allowed_content_types: "application/pdf,image/png,image/jpeg",
};

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function settingsToForm(settings: StorageSettings): FormState {
  return {
    provider: settings.provider === "s3" ? "s3" : "minio",
    is_enabled: Boolean(settings.is_enabled),
    bucket: settings.bucket || "",
    region: settings.region || "",
    endpoint: settings.endpoint || "",
    access_key_id: "",
    secret_access_key: "",
    use_ssl: Boolean(settings.use_ssl),
    force_path_style: Boolean(settings.force_path_style),
    object_prefix: settings.object_prefix || "",
    public_base_url: settings.public_base_url || "",
    max_file_size_bytes: String(settings.max_file_size_bytes || 10485760),
    allowed_content_types: settings.allowed_content_types || "",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function bytesLabel(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageProviderSettingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const filteredTenants = useMemo(() => tenants.filter((tenant) => tenant.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Storage</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Storage Providers</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage file storage for HRMS documents.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Storage</button></td></tr>)}</tbody></table></div>
        </section>
      </main>
    );
  }

  return <StorageProviderManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function StorageProviderManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
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
      const row = await apiRequest<StorageSettings>(`${basePath}/storage-provider-settings`);
      setSettings(row);
      setForm(settingsToForm(row));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setSettings(null);
        setForm(emptyForm);
        setMessage("No tenant storage provider has been selected yet.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load storage settings.");
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
        bucket: form.bucket.trim(),
        region: optionalString(form.region),
        endpoint: optionalString(form.endpoint),
        access_key_id: optionalString(form.access_key_id),
        secret_access_key: optionalString(form.secret_access_key),
        use_ssl: form.use_ssl,
        force_path_style: form.force_path_style,
        object_prefix: optionalString(form.object_prefix),
        public_base_url: optionalString(form.public_base_url),
        max_file_size_bytes: Number(form.max_file_size_bytes) || 10485760,
        allowed_content_types: optionalString(form.allowed_content_types),
      };
      const saved = await apiRequest<StorageSettings>(`${basePath}/storage-provider-settings`, { method: "PUT", body: payload });
      setSettings(saved);
      setForm(settingsToForm(saved));
      setMessage("Storage settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save storage settings.");
    } finally {
      setSaving(false);
    }
  }

  async function testStorage() {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const tested = await apiRequest<StorageSettings>(`${basePath}/storage-provider-settings/test`, { method: "POST" });
      setSettings(tested);
      setForm(settingsToForm(tested));
      setMessage("Storage provider test completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test storage provider.");
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
      await apiRequest(`${basePath}/storage-provider-settings/${settings.id}`, { method: "DELETE" });
      setSettings(null);
      setForm(emptyForm);
      setMessage("Storage settings removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove storage settings.");
    } finally {
      setSaving(false);
    }
  }

  const hints = settings?.readiness_hints || [];

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Storage</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Storage` : "Storage Providers"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Choose S3 or MinIO for profile photos, salary slips, policies, resumes, and employee documents.</p></div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {message ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#047857]">{message}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Provider Settings</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : form.is_enabled ? "Storage writes are enabled" : "Storage writes are disabled"}</p></div><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.is_enabled} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} type="checkbox" /> Enabled</label></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#374151]">Provider<select className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as FormState["provider"], force_path_style: event.target.value === "minio" ? true : current.force_path_style, endpoint: event.target.value === "minio" && !current.endpoint ? "localhost:9000" : current.endpoint }))}><option value="minio">MinIO</option><option value="s3">Amazon S3</option></select></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Bucket<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, bucket: event.target.value }))} placeholder="tenant-files" value={form.bucket} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Region<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} placeholder={form.provider === "s3" ? "ap-south-1" : "optional"} value={form.region} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Endpoint<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, endpoint: event.target.value }))} placeholder={form.provider === "minio" ? "localhost:9000" : "optional for AWS S3"} value={form.endpoint} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Access key<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, access_key_id: event.target.value }))} placeholder={settings?.has_access_key_id ? "Existing key kept" : ""} type="password" value={form.access_key_id} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Secret key<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, secret_access_key: event.target.value }))} placeholder={settings?.has_secret_access_key ? "Existing secret kept" : ""} type="password" value={form.secret_access_key} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Object prefix<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, object_prefix: event.target.value }))} value={form.object_prefix} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Public base URL<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, public_base_url: event.target.value }))} value={form.public_base_url} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Max file size<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, max_file_size_bytes: event.target.value }))} value={form.max_file_size_bytes} /></label>
            <label className="space-y-2 text-sm font-bold text-[#374151]">Allowed content types<input className="h-11 w-full rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, allowed_content_types: event.target.value }))} value={form.allowed_content_types} /></label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.use_ssl} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, use_ssl: event.target.checked }))} type="checkbox" /> Use SSL</label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.force_path_style} className="h-5 w-5 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, force_path_style: event.target.checked }))} type="checkbox" /> Path-style buckets</label>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {settings?.id ? <button className="rounded-xl border border-[#fca5a5] px-5 py-3 text-sm font-black text-[#b91c1c]" disabled={saving} onClick={removeSettings} type="button">Remove</button> : null}
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveSettings} type="button">{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Storage Status</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Provider</dt><dd className="font-black uppercase text-[#111827]">{form.provider}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">State</dt><dd className={form.is_enabled ? "font-black text-[#047857]" : "font-black text-[#c2410c]"}>{form.is_enabled ? "Enabled" : "Disabled"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Limit</dt><dd className="font-black text-[#111827]">{bytesLabel(form.max_file_size_bytes)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Last test</dt><dd className="text-right font-black text-[#111827]">{formatDateTime(settings?.last_test_at)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-bold text-[#6b7280]">Result</dt><dd className="text-right font-black text-[#111827]">{settings?.last_test_status || "-"}</dd></div>
            </dl>
            {settings?.last_test_message ? <p className="mt-4 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold leading-5 text-[#4b5563]">{settings.last_test_message}</p> : null}
            {hints.length ? <ul className="mt-4 space-y-2 text-xs font-semibold leading-5 text-[#6b7280]">{hints.map((hint) => <li className="rounded-xl bg-[#f8faf9] px-3 py-2" key={hint}>{hint}</li>)}</ul> : null}
            <button className="mt-4 w-full rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1f2937] disabled:opacity-60" disabled={testing || !settings?.id} onClick={testStorage} type="button">{testing ? "Testing..." : "Test Connection"}</button>
          </section>
        </aside>
      </section>
    </main>
  );
}
