import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/landing-page-list.ts";

/** Seconds re-listed before the last check, so a page updated mid-check is never missed. */
export const OVERLAP_SECONDS = 120;
export const MAX_PAGES = 5;
export const MAX_EVENTS = 1000;
export const SEEN_WINDOW = 1000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** ISO 8601 with a time-zone offset, as the `updatedAtAfter` filter documents. */
const iso = (seconds: number) =>
  new Date(seconds * 1000).toISOString().replace(/\.\d+Z$/, "+00:00");

const FIELDS = "id,name,title,url,campaignId,formId,createdAt,updatedAt";

/**
 * Since-filter: each check lists landing pages with `updatedAtAfter` = last check minus an overlap
 * (the same `landing-page-list` request) and dedupes on `id:updatedAt`. The first check records
 * the cursor and what it sees, and emits nothing.
 */
const trigger: TriggerDefinition = {
  key: "new-or-updated-landing-page",
  title: "New or Updated Landing Page",
  description: "The run gets each Pardot landing page that is created or changed.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Landing page ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "title", type: "string", label: "Title" },
    { key: "url", type: "string", label: "URL" },
    { key: "campaignId", type: "number", label: "Campaign ID" },
    { key: "formId", type: "number", label: "Form ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 301,
    name: "Spring webinar",
    title: "Join the spring webinar",
    url: "https://go.example.com/spring",
    campaignId: 12,
    formId: 45,
    createdAt: "2026-11-09T10:00:00-05:00",
    updatedAt: "2026-11-09T10:05:00-05:00",
  },
  async poll({ state }, ctx) {
    const checkedAt = Math.floor(clock.now() / 1000);
    const prior = state as { cursor?: unknown } | null;
    const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
    const { events, nextState } = await pollNewItems<Record<string, unknown>>({
      state,
      maxPages: MAX_PAGES,
      maxEvents: MAX_EVENTS,
      seenWindow: SEEN_WINDOW,
      idOf: (x) => `${String(x.id ?? "")}:${String(x.updatedAt ?? "")}`,
      async fetchPage(pageToken) {
        const res = await action.execute(
          pageToken ? { fields: FIELDS, nextPageToken: pageToken } : {
            fields: FIELDS,
            updatedAtAfter: iso(cursor - OVERLAP_SECONDS),
            orderBy: "id DESC",
            limit: 200,
          },
          ctx,
        ) as { values?: Record<string, unknown>[]; nextPageToken?: string | null };
        return { items: res.values ?? [], nextPageToken: res.nextPageToken ?? undefined };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
};

export default trigger;
