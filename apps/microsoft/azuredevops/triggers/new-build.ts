import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import buildList from "../actions/build-list.ts";

const OVERLAP_MS = 120_000;
export const clock = { now: (): number => Date.now() };

interface Params {
  project: string;
}

type Build = { id?: unknown; finishTime?: unknown; queueTime?: unknown };

/** The build list answers at most `$top` runs a page; five pages bound one check. */
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

const stamp = (build: Build): number | undefined => {
  // The list is ordered and filtered by finish time (`minTime`); a run still going has none yet.
  const ms = Date.parse(String(build.finishTime ?? build.queueTime ?? ""));
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * Newest-first feed with a time filter, so a window that holds more than one page resumes by the
 * oldest run's finish time (`maxTime`), never by an offset that new arrivals would shift.
 */
function check(params: Params, state: unknown, ctx: HookContext) {
  return pollWindow<Build, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (build) => String(build.id ?? ""),
    tsOf: stamp,
    async load(since, maxTime) {
      const result = await buildList.execute(
        {
          project: params.project,
          minTime: new Date(since).toISOString(),
          ...(maxTime === undefined ? {} : { maxTime }),
          limit: PAGE_SIZE,
        },
        ctx,
      ) as { builds?: Build[] };
      const items = result.builds ?? [];
      const oldest = items.length >= PAGE_SIZE ? stamp(items[items.length - 1]) : undefined;
      return {
        items,
        next: oldest === undefined ? undefined : new Date(oldest).toISOString(),
      };
    },
  });
}

const trigger: TriggerDefinition<Params> = {
  key: "new-build",
  title: "New Pipeline Run",
  description: "The run gets each pipeline run since the previous check.",
  params: [{ key: "project", label: "Project", type: "string", required: true }],
  output: [{ key: "id", type: "number", label: "Build ID" }],
  sample: { id: 123 },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return check(params, state, ctx);
  },
};

export default trigger;
