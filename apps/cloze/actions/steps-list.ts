import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const stepsList: ActionDefinition<Input> = {
  key: "steps-list",
  type: "read",
  resource: "account",
  title: "List Next Steps",
  description: "List the Next Steps, grouped by segment and stage.",
  params: [
    str("segment", "Segment", { hint: "Optional segment name." }),
    str("stage", "Stage", { hint: "Optional stage name; needs a segment." }),
  ],
  output: [
    { key: "segments", type: "object", label: "Steps keyed by segment, then stage" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "GET", "/v1/user/steps", {
      query: pick(input, ["segment", "stage"]),
    });
    return { segments: res.segments ?? {} };
  },
};

export default stepsList;
