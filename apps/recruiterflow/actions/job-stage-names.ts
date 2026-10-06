import type { ActionDefinition } from "@w6w/types";
import { asList, call } from "../lib/client.ts";

type Input = Record<string, never>;

const jobStageNames: ActionDefinition<Input> = {
  key: "job-stage-names",
  type: "read",
  title: "List Job Stage Names",
  description: "List the distinct pipeline stage names used across jobs.",
  params: [],
  output: [{ key: "items", type: "array", label: "Records" }, {
    key: "total",
    type: "number",
    label: "Total (with include_count)",
  }],

  async execute(_input, ctx) {
    const query = {};
    const res = await call(ctx, "/job/stage_names", { query });
    return asList(res);
  },
};

export default jobStageNames;
