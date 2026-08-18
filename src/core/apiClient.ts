// HTTP 단일 통로 — Flutter ApiClient 이식.
// 계약: Bearer 자동첨부 · 15초 타임아웃 · 401이면 refresh 후 동일 요청 1회 재시도 ·
// 네트워크 예외는 i18n 문구로 감쌈(원문 노출 금지) · 에러 메시지 추출 detail→첫 값.
import { baseUrl, apiPaths } from './apiPaths';
import { tokenStore } from './tokenStore';
import { tr } from './i18n/i18n';

export class ApiException extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const TIMEOUT_MS = 15_000;

type Json = Record<string, unknown>;

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(baseUrl + path, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ApiException(0, tr('api.slowConnection'));
    }
    throw new ApiException(0, tr('api.checkConnection'));
  } finally {
    clearTimeout(timer);
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await rawFetch(apiPaths.refresh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.status === 200) {
      const data = (await res.json()) as { access?: string };
      if (data.access) {
        tokenStore.saveAccess(data.access);
        return true;
      }
    }
  } catch {
    /* 아래 공통 처리 */
  }
  tokenStore.clear();
  return false;
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const obj = data as Json;
    if (typeof obj.detail === 'string') return obj.detail;
    const first = Object.values(obj)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (first !== undefined) return String(first);
  }
  return tr('api.tryAgainLater');
}

async function request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const access = tokenStore.access;
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await rawFetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !retried) {
    if (await tryRefresh()) return request<T>(method, path, body, true);
  }

  if (res.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    if (res.ok) return undefined as T;
    throw new ApiException(res.status, tr('api.serverUnstable'));
  }

  if (!res.ok) throw new ApiException(res.status, extractErrorMessage(data));
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** 비인증 POST — 로그인·가입·비번재설정 공용 (Flutter auth_provider.postJson 이식). */
export async function postJson<T>(
  path: string,
  body: unknown,
  expectedStatus: number,
  failMessage?: string,
): Promise<T> {
  const res = await rawFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiException(res.status, tr('api.serverUnstable'));
  }
  if (res.status !== expectedStatus) {
    throw new ApiException(res.status, failMessage ?? extractErrorMessage(data));
  }
  return data as T;
}
