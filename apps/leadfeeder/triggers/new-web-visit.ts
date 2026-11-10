import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import webVisitSearch from "../actions/web-visit-search.ts";
import { accountIdParam } from "../lib/params.ts";
import { clock, idOf } from "../lib/triggers.ts";

/**
 * Since-filter poll over `web-visit-search` (`POST /v1/web-visits`, operation `searchWebVisits`,
 * https://api.leadfeeder.com/openapi.yaml, 2026-11-10). The endpoint REQUIRES `start_date` and
 * `end_date` (ISO dates, inclusive, day granularity) and documents no sort order, so the window is
 * read in full, page by page; each visit carries a stable `id` and `attributes.started_at`.
 *
 *  - seed: stores `floor = now` and reads nothing; later checks drop every visit whose
 *    `started_at` is before the floor, so a visit that existed before the seed is never emitted.
 *  - window: `start_date = date(cursor - overlap)`, `end_date = today` (UTC); a window with more
 *    than one page is drained across checks through a persisted `resume` page, and the cursor only
 *    advances (to the time the window was opened) once the last page has been read.
 *  - dedupe: `id:started_at` keys, so a re-read visit is not emitted twice.
 */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
const SEEN_CAP = 1000;

interface Since {
  seeded: true;
  floor: number;
  cursor: number;
  seen: string[];
  resume?: { page: number; sinceMs: number; windowEnd: number };
}

type Item = Record<string, unknown>;
const startedAt = (i: Item): string => String((i.attributes as Item | undefined)?.started_at ?? "");
const keyOf = (i: Item) => `${idOf(i)}:${startedAt(i)}`;
const isoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const trigger: TriggerDefinition = {
  key: "new-web-visit",
  title: "New Web Visit",
  description: "The run gets each individual visit to your website, once.",
  params: [accountIdParam],
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const now = clock.now();
    const prev = state as Partial<Since> | null | undefined;
    if (
      !prev || prev.seeded !== true || typeof prev.floor !== "number" ||
      typeof prev.cursor !== "number"
    ) {
      const seed: Since = { seeded: true, floor: now, cursor: now, seen: [] };
      return { events: [], nextState: seed };
    }
    const resume = prev.resume;
    const sinceMs = resume?.sinceMs ?? prev.cursor - OVERLAP_MS;
    const windowEnd = resume?.windowEnd ?? now;
    const page = resume?.page ?? 1;
    const result = await (webVisitSearch as unknown as ActionDefinition).execute(
      {
        accountId: (params as { accountId: string }).accountId,
        startDate: isoDate(sinceMs),
        endDate: isoDate(windowEnd),
        page,
        pageSize: PAGE_SIZE,
      },
      ctx,
    ) as { data?: unknown; nextPage?: unknown };
    const items = (Array.isArray(result?.data) ? result.data : []) as Item[];
    const seen = new Set(prev.seen ?? []);
    const events: Item[] = [];
    for (const item of items) {
      if (idOf(item) === "") throw new Error("Leadfeeder web visit without an id");
      const stamp = Date.parse(startedAt(item));
      if (Number.isFinite(stamp) && stamp < prev.floor) continue; // existed before the seed
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(item);
    }
    const more = typeof result?.nextPage === "number";
    const next: Since = {
      seeded: true,
      floor: prev.floor,
      cursor: more ? prev.cursor : windowEnd,
      seen: [...(prev.seen ?? []), ...events.map(keyOf)].slice(-SEEN_CAP),
      ...(more ? { resume: { page: result.nextPage as number, sinceMs, windowEnd } } : {}),
    };
    return { events, nextState: next };
  },
  output: [
    { key: "id", type: "string", label: "Web visit ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Visit details (source, pages, started_at, ...)" },
    { key: "relationships", type: "object", label: "Company and location references" },
  ],
  sample: {
    id: "5b4f313e-46de-11e8-b981-05bebed8e58b",
    type: "web_visit",
    attributes: {
      source: "google",
      medium: "cpc",
      landing_page_path: "/home",
      started_at: "2026-01-15T10:30:00.000Z",
    },
    relationships: { company: { id: "129011", type: "company" } },
  },
};

export default trigger;
