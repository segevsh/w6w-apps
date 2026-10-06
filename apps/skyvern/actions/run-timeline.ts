import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";

/** `GET /v1/runs/{run_id}/timeline` — the block-by-block timeline of an agent or task_v2 run. */
interface Input {
  runId: string;
}

const runTimeline: ActionDefinition<Input> = {
  key: "run-timeline",
  type: "read",
  resource: "run",
  title: "Get Run Timeline",
  description:
    "Fetch the ordered blocks and thoughts of an agent run, with each block's status and output.",
  params: [
    {
      key: "runId",
      label: "Run ID",
      type: "string",
      required: true,
      hint: "An agent run id (`wr_…`) or a task_v2 run id. A plain v1 task has no timeline.",
    },
  ],
  output: [
    {
      key: "timeline",
      type: "array",
      label: "Timeline entries (type, block, thought, children, …)",
    },
    { key: "count", type: "number", label: "Top-level entries" },
  ],

  async execute(input, ctx) {
    const timeline = await new SkyvernClient(ctx).json<unknown[]>(
      `/v1/runs/${encodeURIComponent(input.runId)}/timeline`,
    );
    return { timeline: timeline ?? [], count: (timeline ?? []).length };
  },
};

export default runTimeline;
