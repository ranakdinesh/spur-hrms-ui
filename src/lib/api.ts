import { getAccessToken } from "@/lib/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiRequestError extends Error {
  status?: number;
  path: string;
  url: string;
  details?: unknown;

  constructor(message: string, context: { status?: number; path: string; url: string; details?: unknown }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = context.status;
    this.path = context.path;
    this.url = context.url;
    this.details = context.details;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  let response: Response;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const accessToken = getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network request failed";
    throw new ApiRequestError(`Unable to reach the server. ${reason}`, {
      path: normalizedPath,
      url,
      details: err,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiRequestError(message, {
      status: response.status,
      path: normalizedPath,
      url,
      details: data,
    });
  }

  return data as T;
}

export async function apiDownload(path: string, options: Omit<RequestInit, "body"> = {}): Promise<{ blob: Blob; filename: string }> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network request failed";
    throw new ApiRequestError(`Unable to reach the server. ${reason}`, {
      path: normalizedPath,
      url,
      details: err,
    });
  }

  if (!response.ok) {
    throw new ApiRequestError(`Download failed with status ${response.status}`, {
      status: response.status,
      path: normalizedPath,
      url,
    });
  }
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return { blob: await response.blob(), filename: decodeURIComponent(match?.[1] || "download") };
}

export function saveBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
