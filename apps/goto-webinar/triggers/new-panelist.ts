import type { TriggerDefinition } from "@w6w/types";
import { pollPanelists } from "../lib/snapshots.ts";

const trigger: TriggerDefinition<{ webinarKey?: string }> = {
  key: "new-panelist",
  title: "New Panelist",
  description:
    "Fires when a panelist is added to the webinar (the webinar's whole panelist list is compared each check). The run gets the panelist.",
  params: [{
    key: "webinarKey",
    label: "Webinar key",
    type: "string",
    required: true,
    hint: "The webinar to watch.",
  }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Panelist ID" },
    { key: "values", type: "object", label: "Panelist" },
  ],
  sample: {
    change: "added",
    key: "3027",
    values: { panelistId: 3027, name: "Grace Hopper", email: "grace@example.com" },
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const webinarKey = String(params?.webinarKey ?? "").trim();
    if (!webinarKey) throw new Error("`webinarKey` is required");
    return await pollPanelists(state, webinarKey, ctx);
  },
};

export default trigger;
