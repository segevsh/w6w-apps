import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/candidate-list.ts";
import { pollWindow, toMs } from "../lib/window.ts";

export const OVERLAP_MS = 120_000;
/** The action's own page ceiling (100 per page): one check reads at most this many candidates. */
const MAX_PAGES = 50;
const PAGE_SIZE = 100;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

export const clock = { now: (): number => Date.now() };

interface Candidate {
  id?: string;
  createdAt?: string;
}

/**
 * `candidate.list` with `createdAfter = cursor - overlap`, read WHOLE in one check (`returnAll`, up
 * to the action's `maxPages` = 50 pages of 100 = 5000 candidates), so an ordinary window cannot
 * stall (brief 9.8). The action exposes no page cursor (only the sync token, which is not a window
 * resume), and Ashby documents no sort, so a window past 5000 candidates in one interval cannot be
 * resumed exactly: the check logs a warning and the surplus is not guaranteed. The seed stores
 * `floor = now` and later checks drop candidates created before it (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-candidate",
  title: "New Candidate",
  description: "Emits candidates created since the previous successful check.",
  params: [],
  output: [{ key: "id", type: "string", label: "Candidate ID" }],
  sample: { id: "cand-101" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Candidate, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: 1,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (item) => String(item.id ?? ""),
      tsOf: (item) => toMs(item.createdAt),
      async load(sinceMs) {
        const result = await action.execute({
          createdAfter: new Date(sinceMs).toISOString(),
          returnAll: true,
          maxPages: MAX_PAGES,
        }, ctx) as { candidates?: Candidate[]; moreDataAvailable?: boolean };
        if (result.moreDataAvailable) {
          ctx.log(
            "warn",
            `new-candidate: more than ${
              MAX_PAGES * PAGE_SIZE
            } candidates in one window; the rest are skipped`,
          );
        }
        return { items: result.candidates ?? [] };
      },
    });
  },
};

export default trigger;
