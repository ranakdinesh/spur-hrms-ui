"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import { getBrowserDeviceID, listDeviceTokens, registerDeviceToken, type DeviceToken } from "@/lib/device-token";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Employee = { user_id: string; firstname: string; middle_name?: string | null; lastname?: string | null; employee_code?: string | null; email?: string | null };

type NotificationMaster = {
  id: string;
  tenant_id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  is_in_app_enabled: boolean;
  is_email_enabled: boolean;
  is_push_enabled: boolean;
  email_subject_template?: string | null;
  email_text_template?: string | null;
  email_html_template?: string | null;
};

type NotificationPreference = {
  id: string;
  notification_master_id: string;
  is_in_app_enabled: boolean;
  is_email_enabled: boolean;
  is_push_enabled: boolean;
  digest_frequency: string;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string | null;
};

type EffectivePreference = {
  master: NotificationMaster;
  preference?: NotificationPreference | null;
  is_in_app_enabled: boolean;
  is_email_enabled: boolean;
  is_push_enabled: boolean;
  digest_frequency: string;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string | null;
  uses_tenant_defaults: boolean;
  provider_ready?: Record<string, boolean>;
  future_ready_features?: string[];
};

const codeOptions = [
  "leaveapplied",
  "leaveapproved",
  "leaverejected",
  "companypolicy",
  "usercelebration",
  "generalnotification",
];

const templateTokens = ["{{tenant_name}}", "{{employee_name}}", "{{notification_title}}", "{{notification_message}}", "{{employee_code}}"];

const emptyMaster = {
  code: "generalnotification",
  name: "",
  description: "",
  is_in_app_enabled: true,
  is_email_enabled: false,
  is_push_enabled: true,
  email_subject_template: "{{tenant_name}} notification",
  email_text_template: "Hello {{employee_name}},\n\n{{notification_message}}\n\nRegards,\n{{tenant_name}}",
  email_html_template: "",
};

function employeeName(employee: Employee) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

export function NotificationSettingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const filteredTenants = useMemo(() => tenants.filter((tenant) => tenant.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !selectedTenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Notification Settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage notification categories and employee preferences.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Settings</button></td></tr>)}</tbody></table></div>
        </section>
      </main>
    );
  }
  return <NotificationSettingsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function NotificationSettingsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [masters, setMasters] = useState<NotificationMaster[]>([]);
  const [preferences, setPreferences] = useState<EffectivePreference[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [selectedUserID, setSelectedUserID] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [masterForm, setMasterForm] = useState(emptyMaster);
  const [editingMaster, setEditingMaster] = useState<NotificationMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const preferencePath = useMemo(() => {
    const query = selectedUserID ? `?user_id=${selectedUserID}` : "";
    return `${basePath}/notification-preferences${query}`;
  }, [basePath, selectedUserID]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [masterRows, employeeRows] = await Promise.all([
        apiRequest<NotificationMaster[]>(`${basePath}/notification-masters`),
        apiRequest<Employee[]>(`${basePath}/employees`).catch(() => []),
      ]);
      setMasters(masterRows);
      setEmployees(employeeRows);
      if (isSuperAdmin && !selectedUserID && employeeRows.length > 0) setSelectedUserID(employeeRows[0].user_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notification settings.");
    } finally {
      setLoading(false);
    }
  }, [basePath, isSuperAdmin, selectedUserID]);

  const loadPreferences = useCallback(async () => {
    if (isSuperAdmin && !selectedUserID) return;
    try {
      setPreferences(await apiRequest<EffectivePreference[]>(preferencePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notification preferences.");
    }
  }, [isSuperAdmin, preferencePath, selectedUserID]);

  const loadDeviceTokens = useCallback(async () => {
    if (isSuperAdmin && !selectedUserID) return;
    try {
      setDeviceTokens(await listDeviceTokens({ basePath, userID: isSuperAdmin ? selectedUserID : undefined }));
    } catch {
      setDeviceTokens([]);
    }
  }, [basePath, isSuperAdmin, selectedUserID]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPreferences(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPreferences]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDeviceTokens(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDeviceTokens]);

  function editMaster(master: NotificationMaster) {
    setEditingMaster(master);
    setMasterForm({ code: master.code, name: master.name || "", description: master.description || "", is_in_app_enabled: master.is_in_app_enabled, is_email_enabled: master.is_email_enabled, is_push_enabled: master.is_push_enabled, email_subject_template: master.email_subject_template || "", email_text_template: master.email_text_template || "", email_html_template: master.email_html_template || "" });
  }

  async function saveMaster() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...masterForm,
        name: masterForm.name.trim(),
        description: masterForm.description.trim() || undefined,
        email_subject_template: masterForm.email_subject_template.trim() || undefined,
        email_text_template: masterForm.email_text_template.trim() || undefined,
        email_html_template: masterForm.email_html_template.trim() || undefined,
      };
      if (editingMaster) {
        await apiRequest<NotificationMaster>(`${basePath}/notification-masters/${editingMaster.id}`, { method: "PUT", body: payload });
        setMessage("Notification master updated.");
      } else {
        await apiRequest<NotificationMaster>(`${basePath}/notification-masters`, { method: "POST", body: payload });
        setMessage("Notification master created.");
      }
      setEditingMaster(null);
      setMasterForm(emptyMaster);
      await loadData();
      await loadPreferences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notification master.");
    } finally {
      setSaving(false);
    }
  }

  async function savePreference(item: EffectivePreference, patch: Partial<NotificationPreference>) {
    if (isSuperAdmin && !selectedUserID) return;
    const payload = {
      notification_master_id: item.master.id,
      is_in_app_enabled: patch.is_in_app_enabled ?? item.is_in_app_enabled,
      is_email_enabled: patch.is_email_enabled ?? item.is_email_enabled,
      is_push_enabled: patch.is_push_enabled ?? item.is_push_enabled,
      digest_frequency: (patch.digest_frequency ?? item.digest_frequency) || "instant",
      quiet_hours_start: patch.quiet_hours_start ?? item.quiet_hours_start ?? undefined,
      quiet_hours_end: patch.quiet_hours_end ?? item.quiet_hours_end ?? undefined,
      timezone: patch.timezone ?? item.timezone ?? undefined,
    };
    try {
      await apiRequest<NotificationPreference>(preferencePath, { method: "PUT", body: payload });
      await loadPreferences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preference.");
    }
  }

  async function registerBrowserToken() {
    setError("");
    setMessage("");
    try {
      await registerDeviceToken({ basePath, userID: isSuperAdmin ? selectedUserID : undefined, token: manualToken.trim() || undefined });
      setManualToken("");
      setMessage("Device token registered.");
      await loadDeviceTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register device token.");
    }
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Notification Settings` : "Notification Settings"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Manage notification categories, channel defaults, and user-level delivery preferences.</p></div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {message ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{message}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">{editingMaster ? "Edit Master" : "Notification Master"}</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-black text-[#374151]">Code<select className="mt-2 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setMasterForm({ ...masterForm, code: event.target.value })} value={masterForm.code}>{codeOptions.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
            <label className="block text-sm font-black text-[#374151]">Name<input className="mt-2 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setMasterForm({ ...masterForm, name: event.target.value })} value={masterForm.name} /></label>
            <label className="block text-sm font-black text-[#374151]">Description<textarea className="mt-2 min-h-[96px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setMasterForm({ ...masterForm, description: event.target.value })} value={masterForm.description} /></label>
            <div className="grid gap-3 sm:grid-cols-3">{(["is_in_app_enabled", "is_email_enabled", "is_push_enabled"] as const).map((key) => <label className="flex items-center gap-2 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-3 py-3 text-xs font-black text-[#374151]" key={key}><input checked={masterForm[key]} onChange={(event) => setMasterForm({ ...masterForm, [key]: event.target.checked })} type="checkbox" />{key === "is_in_app_enabled" ? "In-app" : key === "is_email_enabled" ? "Email" : "Push"}</label>)}</div>
            <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4">
              <p className="text-sm font-black text-[#111827]">Email Template</p>
              <div className="mt-3 flex flex-wrap gap-2">{templateTokens.map((token) => <span className="rounded-full border border-[#dbe0e5] bg-white px-2.5 py-1 text-[11px] font-black text-[#4b5563]" key={token}>{token}</span>)}</div>
              <label className="mt-4 block text-xs font-black uppercase tracking-wide text-[#6b7280]">Subject<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm normal-case tracking-normal outline-none focus:border-[#588368]" onChange={(event) => setMasterForm({ ...masterForm, email_subject_template: event.target.value })} value={masterForm.email_subject_template} /></label>
              <label className="mt-4 block text-xs font-black uppercase tracking-wide text-[#6b7280]">Text Body<textarea className="mt-2 min-h-[150px] w-full rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#588368]" onChange={(event) => setMasterForm({ ...masterForm, email_text_template: event.target.value })} value={masterForm.email_text_template} /></label>
              <label className="mt-4 block text-xs font-black uppercase tracking-wide text-[#6b7280]">HTML Body<textarea className="mt-2 min-h-[120px] w-full rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 font-mono text-xs normal-case tracking-normal outline-none focus:border-[#588368]" onChange={(event) => setMasterForm({ ...masterForm, email_html_template: event.target.value })} placeholder="<p>{{notification_message}}</p>" value={masterForm.email_html_template} /></label>
            </div>
            <div className="flex gap-3"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={saving || !masterForm.name.trim()} onClick={saveMaster} type="button">{saving ? "Saving..." : editingMaster ? "Update" : "Create"}</button>{editingMaster ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => { setEditingMaster(null); setMasterForm(emptyMaster); }} type="button">Cancel</button> : null}</div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#edf1ef] p-5"><div><h2 className="text-xl font-black text-[#111827]">Tenant Defaults</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : `${masters.length} notification categories`}</p></div><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Refresh</button></div>
            <div className="divide-y divide-[#edf1ef]">{masters.map((master) => <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between" key={master.id}><div><strong className="text-sm text-[#111827]">{master.name || master.code}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{master.code} · {master.description || "No description"}</p><div className="mt-3 flex flex-wrap gap-2">{["In-app", "Email", "Push"].map((label) => { const enabled = label === "In-app" ? master.is_in_app_enabled : label === "Email" ? master.is_email_enabled : master.is_push_enabled; return <span className={`rounded-full px-3 py-1 text-xs font-black ${enabled ? "bg-[#e7f6ed] text-[#237a45]" : "bg-[#f3f4f6] text-[#6b7280]"}`} key={label}>{label}</span>; })}{master.email_subject_template || master.email_text_template || master.email_html_template ? <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">Template</span> : null}</div></div><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => editMaster(master)} type="button">Edit</button></div>)}</div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Effective Preferences</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">Saved overrides are combined with tenant defaults.</p></div><select className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368] lg:w-[300px]" disabled={employees.length === 0} onChange={(event) => setSelectedUserID(event.target.value)} value={selectedUserID}><option value="">{isSuperAdmin ? "Select employee" : "Current user"}</option>{employees.map((employee) => <option key={employee.user_id} value={employee.user_id}>{employeeName(employee)}{employee.employee_code ? ` (${employee.employee_code})` : ""}</option>)}</select></div>
            <div className="divide-y divide-[#edf1ef]">{preferences.map((item) => <div className="space-y-4 p-5" key={item.master.id}><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><strong className="text-sm text-[#111827]">{item.master.name || item.master.code}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{item.uses_tenant_defaults ? "Using tenant defaults" : "User override saved"}</p></div><select className="h-10 rounded-xl border border-[#dbe0e5] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => void savePreference(item, { digest_frequency: event.target.value })} value={item.digest_frequency || "instant"}><option value="instant">Instant</option><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option><option value="muted">Muted</option></select></div><div className="grid gap-3 md:grid-cols-3">{(["is_in_app_enabled", "is_email_enabled", "is_push_enabled"] as const).map((key) => <label className="flex items-center justify-between rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]" key={key}><span>{key === "is_in_app_enabled" ? "In-app" : key === "is_email_enabled" ? "Email" : "Push"}</span><input checked={item[key]} disabled={key === "is_email_enabled" && !item.master.is_email_enabled || key === "is_push_enabled" && !item.master.is_push_enabled || key === "is_in_app_enabled" && !item.master.is_in_app_enabled} onChange={(event) => void savePreference(item, { [key]: event.target.checked })} type="checkbox" /></label>)}</div><div className="grid gap-3 md:grid-cols-3"><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onBlur={(event) => void savePreference(item, { quiet_hours_start: event.target.value || null })} placeholder="Quiet start HH:MM" type="time" defaultValue={item.quiet_hours_start || ""} /><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onBlur={(event) => void savePreference(item, { quiet_hours_end: event.target.value || null })} placeholder="Quiet end HH:MM" type="time" defaultValue={item.quiet_hours_end || ""} /><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onBlur={(event) => void savePreference(item, { timezone: event.target.value || null })} placeholder="Timezone, e.g. Asia/Kolkata" defaultValue={item.timezone || ""} /></div></div>)}</div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Device Tokens</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">Browser device ID: {getBrowserDeviceID()}</p></div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setManualToken(event.target.value)} placeholder="Browser notification token (optional)" value={manualToken} /><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={isSuperAdmin && !selectedUserID} onClick={registerBrowserToken} type="button">Register Browser</button></div>
              <div className="divide-y divide-[#edf1ef] rounded-xl border border-[#edf1ef]">{deviceTokens.length === 0 ? <div className="p-4 text-sm font-semibold text-[#6b7280]">No active device tokens.</div> : deviceTokens.map((token) => <div className="p-4" key={token.id}><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><strong className="text-sm text-[#111827]">{token.device_type || "device"} · {token.device_id || "-"}</strong><span className="text-xs font-bold text-[#6b7280]">{new Date(token.updated_at).toLocaleString()}</span></div><p className="mt-2 truncate text-xs font-semibold text-[#6b7280]">{token.device_token}</p></div>)}</div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
