import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  templateIds: string[];
  from: string;
  to: string;
}

/** Aggregated send, delivery, read, click and reply counts and rates per template over a period. */
const templateAnalyticsGet: ActionDefinition<Input> = {
  key: "template-analytics-get",
  type: "read",
  resource: "template",
  title: "Get Template Analytics",
  description:
    "Aggregated send, delivery, read, click and reply counts and rates per template over a period.",
  params: [
    {
      "key": "templateIds",
      "label": "Template IDs",
      "type": "json",
      "required": true,
      "hint": "Array of template ids.",
    },
    { "key": "from", "label": "From", "type": "datetime", "required": true, "hint": "ISO 8601." },
    { "key": "to", "label": "To", "type": "datetime", "required": true, "hint": "ISO 8601." },
  ],
  output: [
    { "key": "period", "type": "object", "label": "Period" },
    { "key": "results", "type": "array", "label": "One entry per template" },
  ],

  execute(input, ctx) {
    if (!Array.isArray(input.templateIds) || input.templateIds.length === 0) {
      throw new Error("Superchat: template IDs must be a non-empty array");
    }
    return new SuperchatClient(ctx).request("/analytics/templates", {
      query: { template_ids: input.templateIds, from: input.from, to: input.to },
    });
  },
};

export default templateAnalyticsGet;
