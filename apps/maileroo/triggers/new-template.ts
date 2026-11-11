import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listTemplates from "../actions/list-templates.ts";

/**
 * `GET /v1/templates` answers the account's whole template set as one unpaginated array
 * (https://maileroo.com/docs/api-reference/templates/list), a small hand-curated collection, so
 * each check diffs the IDs against the previous check (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-template",
  title: "New Template",
  description: "The run gets each email template newly created on the account.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "template_name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type (editor, html, url, zip)" },
  ],
  sample: { id: "tpl-1", template_name: "Welcome", type: "editor" },
  async poll({ state }, ctx) {
    const out = await listTemplates.execute({}, ctx) as { templates?: Array<{ id?: unknown }> };
    const templates = out.templates ?? [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: templates.map((t) => ({ key: String(t.id), values: { id: t.id } })),
      emit: { added: true, updated: false },
    });
    const byId = new Map(templates.map((t) => [String(t.id), t]));
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default trigger;
