import { env, requireTyxterApiKey } from "@/lib/env";
import { TyxterApiError, type TyxterApiErrorPayload } from "@/lib/tyxter/types";

type Primitive = string | number | boolean;

function buildUrl(path: string, query?: Record<string, Primitive | null | undefined>) {
  const url = new URL(path, env.TYXTER_API_BASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const json = text ? (JSON.parse(text) as T | TyxterApiErrorPayload) : null;

  if (!response.ok) {
    const errorPayload = (json ?? {}) as TyxterApiErrorPayload;
    throw new TyxterApiError(errorPayload.message ?? `Tyxter request failed with status ${response.status}`, {
      status: response.status,
      code: errorPayload.code,
      details: errorPayload.details,
      requestId: errorPayload.request_id,
      traceId: errorPayload.trace_id,
    });
  }

  return json as T;
}

export async function tyxterFetch<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    query?: Record<string, Primitive | null | undefined>;
    headers?: Record<string, string>;
  },
) {
  const response = await fetch(buildUrl(path, options?.query), {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${requireTyxterApiKey()}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  return parseResponse<T>(response);
}

export async function tyxterFetchRaw(
  path: string,
  options?: {
    method?: string;
    query?: Record<string, Primitive | null | undefined>;
    headers?: Record<string, string>;
  },
) {
  const response = await fetch(buildUrl(path, options?.query), {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${requireTyxterApiKey()}`,
      ...options?.headers,
    },
    cache: "no-store",
    redirect: "manual",
  });

  if (!response.ok && response.status !== 302 && response.status !== 307) {
    await parseResponse(response);
  }

  return response;
}
