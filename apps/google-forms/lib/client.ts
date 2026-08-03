import type { HookContext } from "@w6w/types";

/**
 * Google Forms API v1. Verified against the live discovery document
 * (`https://forms.googleapis.com/$discovery/rest?version=v1`, revision
 * 20260729): `rootUrl` is `https://forms.googleapis.com/` and every method
 * path is `v1/forms…`, so the service prefix below is exact.
 */
export const FORMS_API = "https://forms.googleapis.com/v1";

/**
 * Drive v3. The Forms API has **no** list/search method — the only way to
 * enumerate forms is Drive's `files.list` filtered by the Google Forms MIME
 * type. That is a different origin, hence the second constant.
 */
export const DRIVE_API = "https://www.googleapis.com/drive/v3";

/** The Drive MIME type for a Google Form (Drive "MIME types" reference). */
export const FORM_MIME_TYPE = "application/vnd.google-apps.form";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is injected by the auth `sign` hook —
 * this client never touches Authorization directly.
 *
 * Callers pass either an absolute URL, a `/drive/v3/…` path (routed to
 * `www.googleapis.com`), or a `/forms…` path (routed to `forms.googleapis.com`
 * under `/v1`). Forms responses vary widely — `Form`, `FormResponse`,
 * `BatchUpdateFormResponse`, Drive's `FileList` — so the response type is left
 * loose and each action narrows what it consumes.
 */
export class GoogleFormsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http")
        ? path
        : path.startsWith("/drive/")
        ? `https://www.googleapis.com${path}`
        : `${FORMS_API}${path.startsWith("/") ? path : `/${path}`}`,
    );
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google Forms ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Extract a form ID from a Google Forms edit URL. Falls back to returning the
 * input unchanged when it doesn't look like a URL, so users can paste either a
 * raw ID or the URL out of their browser bar.
 *
 * Both the `/forms/d/<id>/edit` (editor) and `/forms/d/e/<id>/viewform`
 * (responder) shapes appear in the wild; only the editor form carries the
 * `formId` the API accepts, so the responder shape is deliberately not matched.
 */
export function extractFormId(input: string): string {
  const match = /https:\/\/docs\.google\.com\/forms\/d\/([a-zA-Z0-9-_]+)/.exec(input);
  if (!match) return input;
  // `/forms/d/e/…` is the published responder ID, which is NOT the API formId.
  return match[1] === "e" ? input : match[1];
}

/**
 * A single member of `BatchUpdateFormRequest.requests[]`. Google models it as a
 * union with exactly one populated key — one of `updateFormInfo`,
 * `updateSettings`, `createItem`, `moveItem`, `deleteItem`, `updateItem`
 * (verified from the discovery doc's `Request` schema).
 */
export type BatchUpdateRequest = Record<string, unknown>;

export interface WriteControl {
  targetRevisionId?: string;
  requiredRevisionId?: string;
}

export interface BatchUpdateBody {
  requests: BatchUpdateRequest[];
  includeFormInResponse?: boolean;
  writeControl?: WriteControl;
}

/**
 * `WriteControl` accepts exactly one of `targetRevisionId` / `requiredRevisionId`.
 * Returns `undefined` when neither was supplied so the key is omitted entirely
 * rather than sent as an empty object.
 */
export function buildWriteControl(
  targetRevisionId?: string,
  requiredRevisionId?: string,
): WriteControl | undefined {
  if (targetRevisionId) return { targetRevisionId };
  if (requiredRevisionId) return { requiredRevisionId };
  return undefined;
}

/**
 * Build the `:batchUpdate` body for a single typed request. Every per-verb
 * action in this app funnels through here so the envelope is written once.
 */
export function singleRequestBody(
  request: BatchUpdateRequest,
  options: {
    includeFormInResponse?: boolean;
    targetRevisionId?: string;
    requiredRevisionId?: string;
  } = {},
): BatchUpdateBody {
  const body: BatchUpdateBody = { requests: [request] };
  if (options.includeFormInResponse) body.includeFormInResponse = true;
  const writeControl = buildWriteControl(options.targetRevisionId, options.requiredRevisionId);
  if (writeControl) body.writeControl = writeControl;
  return body;
}

/**
 * Send a batchUpdate. `formId` is normalised through `extractFormId` first so
 * every action accepts a pasted editor URL.
 */
export function batchUpdate<T = unknown>(
  ctx: HookContext,
  formId: string,
  body: BatchUpdateBody,
): Promise<T> {
  const client = new GoogleFormsClient(ctx);
  return client.request<T>(
    `/forms/${encodeURIComponent(extractFormId(formId))}:batchUpdate`,
    { method: "POST", body },
  );
}

/**
 * Turn a set of supplied fields into a FieldMask.
 *
 * `updateFormInfo` / `updateSettings` both **require** `updateMask` and reject
 * an empty one, and the root (`info` / `settings`) is implied and must not be
 * named. Callers may pass an explicit mask; otherwise we derive it from the
 * keys the user actually filled in, which is the behaviour that makes a partial
 * form update do the obvious thing.
 */
export function deriveUpdateMask(
  explicit: string | undefined,
  present: Record<string, unknown>,
): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const keys = Object.keys(present).filter((k) => present[k] !== undefined);
  if (keys.length === 0) {
    throw new Error(
      "updateMask is required: supply at least one field to update, or set it explicitly",
    );
  }
  return keys.join(",");
}
