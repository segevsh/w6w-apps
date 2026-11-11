import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { allTemplates } from "../lib/feeds.ts";

/**
 * `GET /templates` has no sort order and no date field
 * (https://docs.seamless.ai/api-reference/v2/templates/list-templates), so each check reads the
 * user's whole template set (50 per page, at most 20 pages) and diffs the ids (`pollSnapshot`,
 * added only).
 */
const trigger: TriggerDefinition = {
  key: "new-template",
  title: "New Template",
  description: "The run gets each outreach template created since the last check.",
  minIntervalMs: 300_000,
  output: [
    { key: "templateId", type: "string", label: "Template ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "name", type: "string", label: "Name" },
    { key: "subject", type: "string", label: "Subject" },
  ],
  sample: { templateId: "301", type: "email", name: "Follow up", subject: "Following up" },
  async poll({ state }, ctx) {
    const data = await allTemplates(ctx) as Array<{ templateId: string | number }>;
    const { events, nextState } = await pollSnapshot({
      state,
      rows: data.map((r) => ({ key: String(r.templateId), values: r })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
