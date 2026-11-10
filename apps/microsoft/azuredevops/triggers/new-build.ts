import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import buildList from "../actions/build-list.ts";

const OVERLAP_MS = 120_000;
export const clock = { now: (): number => Date.now() };

interface Params {
  project: string;
}

interface State {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

async function check(params: Params, state: unknown, ctx: HookContext) {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<{ id?: unknown }>({
    state,
    idOf: (build) => String(build.id ?? ""),
    async fetchPage() {
      const result = await buildList.execute(
        {
          project: params.project,
          minTime: new Date(cursor - OVERLAP_MS).toISOString(),
          limit: 100,
        },
        ctx,
      ) as { builds?: Array<{ id?: unknown }> };
      return { items: result.builds ?? [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } as State };
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
