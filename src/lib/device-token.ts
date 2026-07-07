import { apiRequest } from "@/lib/api";

const DEVICE_ID_KEY = "setika.hrms.device_id";

export type DeviceToken = {
  id: string;
  tenant_id: string;
  user_id: string;
  device_token: string;
  device_type?: string | null;
  device_id?: string | null;
  created_at: string;
  updated_at: string;
};

function randomID() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getBrowserDeviceID() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = randomID();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export function defaultBrowserDeviceToken(deviceID = getBrowserDeviceID()) {
  return `web:${deviceID}`;
}

export async function registerDeviceToken(input?: { basePath?: string; userID?: string; token?: string; deviceType?: string }) {
  const basePath = input?.basePath || "/hrms";
  const deviceID = getBrowserDeviceID();
  return apiRequest<DeviceToken>(`${basePath}/device-tokens`, {
    method: "POST",
    body: {
      user_id: input?.userID,
      device_id: deviceID,
      device_type: input?.deviceType || "web",
      device_token: input?.token || defaultBrowserDeviceToken(deviceID),
    },
  });
}

export async function listDeviceTokens(input?: { basePath?: string; userID?: string }) {
  const basePath = input?.basePath || "/hrms";
  const query = input?.userID ? `?user_id=${input.userID}` : "";
  return apiRequest<DeviceToken[]>(`${basePath}/device-tokens${query}`);
}
