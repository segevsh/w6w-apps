import type { HookContext } from "@w6w/types";
import responseList from "../actions/response-list.ts";
import { extractFormId } from "./client.ts";

/**
 * New form responses — a since-filter poll over the `response-list` request
 * (`GET /v1/forms/{formId}/responses?filter=timestamp > N`).
 *
 * The Forms API documents no order for the list, so every page of a window is read and nothing is
 * assumed about page order:
 *   - a check reads `timestamp > cursor − 120s` (the overlap catches a late write) and dedupes by
 *     `responseId`;
 *   - the window is drained across checks (at most `MAX_PAGES` pages of `PAGE_SIZE` per check):
 *     the page position is kept in `resume`, and the cursor only advances once the last page was read;
 *   - the seed stores `floor = now` and reads nothing; a response CREATED before the floor is never
 *     emitted, so a form with a long backlog never floods the first real check.
 *
 * Not covered: `forms.watches`. Google can deliver Pub/Sub messages to a web hook, but a ping names
 * the form and event type and carries no response data, the topic must be owned by the Cloud project
 * that calls the API (not the w6w user's), a watch expires and nothing in the trigger lifecycle
 * renews it, and Pub/Sub push authenticates with a Google-signed RS256 JWT while `_shared/webhook`
 * only has HMAC helpers — https://developers.google.com/workspace/forms/api/guides/push-notifications
 * (verified 2026-11-10).
 */

export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 200;
export const MAX_PAGES = 3;
export const SEEN_WINDOW = 1000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface FormResponse {
  responseId?: string;
  createTime?: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  totalScore?: number;
  answers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResponsesState {
  v: 1;
  kind: "responses";
  seeded: true;
  /** Epoch ms of the seed: responses created before it are never emitted. */
  floor: number;
  /** Epoch ms: the newest submission time seen in a fully drained window. */
  cursor: number;
  /** Most recently emitted response ids (FIFO, `SEEN_WINDOW`). */
  ids: string[];
  /** Set while a window is being drained. */
  resume?: { from: number; pageToken: string; maxTs: number };
}

const rfc3339 = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const time = (v: unknown) => (typeof v === "string" ? Date.parse(v) : NaN);

export async function checkNewResponses(
  params: { formId: string },
  state: unknown,
  ctx: HookContext,
): Promise<{ events: FormResponse[]; nextState: ResponsesState }> {
  const prior = state as Partial<ResponsesState> | null;
  if (
    !prior || prior.seeded !== true || prior.kind !== "responses" ||
    typeof prior.floor !== "number" || typeof prior.cursor !== "number" || !Array.isArray(prior.ids)
  ) {
    const now = clock.now();
    return {
      events: [],
      nextState: { v: 1, kind: "responses", seeded: true, floor: now, cursor: now, ids: [] },
    };
  }

  const formId = extractFormId(params.formId);
  const from = prior.resume?.from ?? prior.cursor - OVERLAP_MS;
  let pageToken: string | undefined = prior.resume?.pageToken;
  let maxTs = prior.resume?.maxTs ?? prior.cursor;
  const seen = new Set(prior.ids);
  const fresh: FormResponse[] = [];

  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await responseList.execute({
      formId: params.formId,
      submittedAfter: rfc3339(Math.max(0, from)),
      pageSize: PAGE_SIZE,
      pageToken,
    }, ctx) as { responses?: FormResponse[]; nextPageToken?: string };
    for (const r of res.responses ?? []) {
      const ts = Math.max(time(r.lastSubmittedTime), time(r.createTime));
      if (!Number.isNaN(ts)) maxTs = Math.max(maxTs, ts);
      const id = r.responseId;
      if (!id || seen.has(id)) continue;
      const created = time(r.createTime);
      if (!Number.isNaN(created) && created < prior.floor) continue;
      seen.add(id);
      fresh.push({ ...r, formId });
    }
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }

  fresh.sort((a, b) => time(a.createTime) - time(b.createTime));
  const ids = [...prior.ids, ...fresh.map((r) => r.responseId as string)].slice(-SEEN_WINDOW);
  const nextState: ResponsesState = pageToken
    ? {
      v: 1,
      kind: "responses",
      seeded: true,
      floor: prior.floor,
      cursor: prior.cursor,
      ids,
      resume: { from, pageToken, maxTs },
    }
    : { v: 1, kind: "responses", seeded: true, floor: prior.floor, cursor: maxTs, ids };
  return { events: fresh, nextState };
}
