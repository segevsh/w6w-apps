import type { HookContext, Param } from "@w6w/types";

/**
 * Google Slides API v1. Verified against the live discovery document
 * (`https://slides.googleapis.com/$discovery/rest?version=v1`, revision
 * `20260729`): `rootUrl` is `https://slides.googleapis.com/` and every method
 * path is `v1/presentations…`, so the service prefix below is exact.
 *
 * The whole API is **five** methods — `presentations.create`,
 * `presentations.get`, `presentations.batchUpdate`, `presentations.pages.get`
 * and `presentations.pages.getThumbnail`. Everything else lives inside the
 * 44-member `Request` union that `:batchUpdate` accepts.
 */
export const SLIDES_API = "https://slides.googleapis.com/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is injected by the auth `sign` hook —
 * this client never touches Authorization directly.
 *
 * Unlike the sibling `google-docs` / `google-sheets` / `google-forms` clients
 * there is no second origin to route to: this app never calls Drive, so every
 * path resolves against `slides.googleapis.com/v1`. Responses vary
 * (`Presentation`, `Page`, `Thumbnail`, `BatchUpdatePresentationResponse`), so
 * the response type is left loose and each action narrows what it consumes.
 */
export class GoogleSlidesClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${SLIDES_API}${path.startsWith("/") ? path : `/${path}`}`,
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
        `Google Slides ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Extract a presentation ID from a Google Slides URL. Falls back to returning
 * the input unchanged when it doesn't look like a URL, so users can paste
 * either a raw ID or the URL out of their browser bar.
 *
 * Both `/presentation/d/<id>/edit` (editor) and `/presentation/d/e/<id>/pub`
 * (published) shapes exist. Only the editor form carries the `presentationId`
 * the API accepts, so — exactly as in the `google-forms` app — the published
 * `d/e/` identifier is deliberately **not** unwrapped.
 */
export function extractPresentationId(input: string): string {
  const match = /https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/.exec(input);
  if (!match) return input;
  return match[1] === "e" ? input : match[1];
}

/**
 * A single member of `BatchUpdatePresentationRequest.requests[]`. Google models
 * it as a union with exactly one populated key — 44 of them, from `createSlide`
 * through `updateTableBorderProperties` (verified from the discovery document's
 * `Request` schema).
 */
export type BatchUpdateRequest = Record<string, unknown>;

/**
 * Slides' `WriteControl` carries **only** `requiredRevisionId` — there is no
 * `targetRevisionId` arm here, unlike the Docs and Forms APIs. Getting that
 * wrong produces a silently-ignored write control, so it is modelled exactly.
 */
export interface WriteControl {
  requiredRevisionId?: string;
}

export interface BatchUpdateBody {
  requests: BatchUpdateRequest[];
  writeControl?: WriteControl;
}

/**
 * Returns `undefined` when no revision was supplied so the key is omitted
 * entirely rather than sent as an empty object.
 */
export function buildWriteControl(requiredRevisionId?: string): WriteControl | undefined {
  return requiredRevisionId ? { requiredRevisionId } : undefined;
}

/**
 * Build the `:batchUpdate` body for a single typed request. Every per-verb
 * action in this app funnels through here so the envelope is written once.
 */
export function singleRequestBody(
  request: BatchUpdateRequest,
  options: { requiredRevisionId?: string } = {},
): BatchUpdateBody {
  const body: BatchUpdateBody = { requests: [request] };
  const writeControl = buildWriteControl(options.requiredRevisionId);
  if (writeControl) body.writeControl = writeControl;
  return body;
}

/**
 * Send a batchUpdate. `presentationId` is normalised through
 * `extractPresentationId` first, so every action accepts a pasted editor URL.
 *
 * The batch is **atomic**: Google validates every request before applying any,
 * and "if any request is not valid, then the entire request will fail and
 * nothing will be applied". So a 2xx here means the whole batch landed — there
 * is no partial-success 200 to defend against. What a 2xx does *not* promise is
 * that anything *matched*: see `occurrencesChanged` on the find-and-replace
 * actions.
 */
export function batchUpdate<T = unknown>(
  ctx: HookContext,
  presentationId: string,
  body: BatchUpdateBody,
): Promise<T> {
  const client = new GoogleSlidesClient(ctx);
  return client.request<T>(
    `/presentations/${encodeURIComponent(extractPresentationId(presentationId))}:batchUpdate`,
    { method: "POST", body },
  );
}

/**
 * The flattened size/position inputs the element-creating actions expose,
 * before they are folded into Google's nested `PageElementProperties`.
 */
export interface ElementPlacement {
  pageObjectId: string;
  width?: number;
  height?: number;
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  /** Units for both `size` and `transform`. Google accepts `EMU` or `PT`. */
  unit?: "EMU" | "PT";
}

/**
 * Fold the flattened placement inputs into `PageElementProperties`.
 *
 * Shape taken verbatim from Google's own `createShape` sample
 * (developers.google.com/workspace/slides/api/guides/add-shape):
 *
 * ```json
 * { "pageObjectId": "…",
 *   "size":      { "width": {"magnitude": 350, "unit": "PT"},
 *                  "height": {"magnitude": 350, "unit": "PT"} },
 *   "transform": { "scaleX": 1, "scaleY": 1,
 *                  "translateX": 350, "translateY": 100, "unit": "PT" } }
 * ```
 *
 * `size` and `transform` are both optional on the wire (omitting them lets
 * Google auto-place the element), so each sub-object is emitted only when the
 * caller actually supplied something for it. `scaleX`/`scaleY` default to 1
 * whenever a translation is given: a transform with a zero scale collapses the
 * element to nothing, which is never what a caller who only set a position
 * meant.
 */
export function buildElementProperties(p: ElementPlacement): Record<string, unknown> {
  const unit = p.unit ?? "EMU";
  const props: Record<string, unknown> = { pageObjectId: p.pageObjectId };

  if (p.width !== undefined || p.height !== undefined) {
    const size: Record<string, unknown> = {};
    if (p.width !== undefined) size.width = { magnitude: p.width, unit };
    if (p.height !== undefined) size.height = { magnitude: p.height, unit };
    props.size = size;
  }

  const hasTransform = p.translateX !== undefined || p.translateY !== undefined ||
    p.scaleX !== undefined || p.scaleY !== undefined;
  if (hasTransform) {
    props.transform = {
      scaleX: p.scaleX ?? 1,
      scaleY: p.scaleY ?? 1,
      translateX: p.translateX ?? 0,
      translateY: p.translateY ?? 0,
      unit,
    };
  }

  return props;
}

/**
 * The size/position params every element-creating action shares. Declared once
 * so `image-create`, `shape-create` and `table-create` cannot drift apart.
 */
export const PLACEMENT_PARAMS: Param[] = [
  {
    key: "pageObjectId",
    label: "Slide (Page) Object ID",
    type: "string",
    required: true,
    hint: "The object ID of the slide to place the element on — see the Get Presentation output.",
  },
  {
    key: "unit",
    label: "Units",
    type: "select",
    default: "EMU",
    options: [
      { value: "EMU", label: "EMU (English Metric Units — 12700 per point)" },
      { value: "PT", label: "PT (points)" },
    ],
    hint: "Applies to both the size and the translation below.",
  },
  { key: "width", label: "Width", type: "number" },
  { key: "height", label: "Height", type: "number" },
  { key: "translateX", label: "Translate X", type: "number" },
  { key: "translateY", label: "Translate Y", type: "number" },
  {
    key: "scaleX",
    label: "Scale X",
    type: "number",
    hint: "Defaults to 1 when a translation is given.",
  },
  {
    key: "scaleY",
    label: "Scale Y",
    type: "number",
    hint: "Defaults to 1 when a translation is given.",
  },
];

/**
 * The optional revision-guard param every write action shares.
 * `presentations.get` returns `revisionId`; passing it here makes the write
 * fail with 400 if anyone else edited the deck in between.
 */
export const REVISION_PARAM: Param = {
  key: "requiredRevisionId",
  label: "Required Revision ID",
  type: "string",
  hint:
    "Optional. The presentation's `revisionId` from a prior read. If it no longer matches, Google rejects the write with 400 instead of clobbering someone else's edit.",
};

/**
 * Build Google's `SubstringMatchCriteria`. Shared by the two find-and-replace
 * actions so their matching semantics cannot diverge.
 */
export function buildMatchCriteria(
  text: string,
  matchCase?: boolean,
  searchByRegex?: boolean,
): Record<string, unknown> {
  const criteria: Record<string, unknown> = { text, matchCase: matchCase ?? false };
  if (searchByRegex !== undefined) criteria.searchByRegex = searchByRegex;
  return criteria;
}
