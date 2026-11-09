import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import linkList from "../actions/link-list.ts";

/** Seconds of look-back before the previous check, so a link that lands late is still seen. */
export const OVERLAP_SECONDS = 120;
/** Egnyte caps `count` at 500. */
const PAGE_SIZE = 500;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface CursorState {
  cursor?: unknown;
}

const iso = (ms: number): string => new Date(ms).toISOString();

/** Since-filter shape: the `link-list` request with `created_after = cursor - overlap`. */
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
  async poll({ state }, ctx: HookContext) {
    const now = clock.now();
    const prior = (state ?? {}) as CursorState;
    const since = typeof prior.cursor === "number" ? prior.cursor : now;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      maxPages: 1,
      maxEvents: PAGE_SIZE,
      seenWindow: 1000,
      fetchPage: async () => {
        const result = await linkList.execute({
          createdAfter: iso(since - OVERLAP_SECONDS * 1000),
          offset: 0,
          count: PAGE_SIZE,
        }, ctx) as { links?: unknown[] };
        return { items: Array.isArray(result?.links) ? result.links : [] };
      },
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    });
    return { events, nextState: { ...nextState, cursor: now } };
  },
};

export default trigger;
