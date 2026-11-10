import type { HookContext, TriggerDefinition } from "@w6w/types";
import linkList from "../actions/link-list.ts";
import { pollWindow, toMs } from "../lib/window.ts";

/** Seconds of look-back before the previous check, so a link that lands late is still seen. */
export const OVERLAP_SECONDS = 120;
/** Egnyte caps `count` at 500. */
const PAGE_SIZE = 500;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** Per-check ceiling: 4 pages of 500; a longer window is resumed on the next check (brief 9.8). */
const MAX_PAGES = 4;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

/** `creation_date` can be day-granular: such a link is dropped only when its WHOLE day precedes the floor. */
const DAY_ONLY = /^\d{4}-\d\d-\d\d$/;
const createdMs = (v: unknown): number | undefined =>
  typeof v === "string" && DAY_ONLY.test(v) ? Date.parse(`${v}T23:59:59.999Z`) : toMs(v);

const iso = (ms: number): string => new Date(ms).toISOString();

/**
 * Since-filter shape: the `link-list` request with `created_after = cursor - overlap`, paged by
 * `offset`. The offset is pinned to the window's own `created_after` (persisted with it), so a
 * window longer than MAX_PAGES pages is resumed on the next check and the cursor moves only once
 * it drains (brief 9.8); an insertion at the front can only repeat a link (deduped by id), never
 * skip one. The seed stores `floor = now` and later checks drop older links (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-link",
  title: "New Link",
  description: "The run gets each newly created share link.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Link ID" },
    { key: "path", type: "string", label: "Path" },
    { key: "url", type: "string", label: "Link URL" },
    { key: "creation_date", type: "string", label: "Created at" },
  ],
  sample: {
    id: "abc123",
    path: "/Shared/report.pdf",
    url: "https://example.egnyte.com/fl/abc123",
    creation_date: "2026-11-09",
  },
  poll({ state }, ctx: HookContext) {
    return pollWindow<unknown, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_SECONDS * 1000,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      tsOf: (item) => createdMs((item as { creation_date?: unknown }).creation_date),
      async load(sinceMs, offset) {
        const result = await linkList.execute({
          createdAfter: iso(sinceMs),
          offset: offset ?? 0,
          count: PAGE_SIZE,
        }, ctx) as { links?: unknown[] };
        const links = Array.isArray(result?.links) ? result.links : [];
        return {
          items: links,
          next: links.length >= PAGE_SIZE ? (offset ?? 0) + PAGE_SIZE : undefined,
        };
      },
    });
  },
};

export default trigger;
