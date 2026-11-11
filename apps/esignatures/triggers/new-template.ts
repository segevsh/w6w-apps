import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import templateList from "../actions/template-list.ts";

/**
 * Small bounded collection: `GET /api/templates` answers every template of the account in one
 * response (`template_id`, `title`) and takes no paging, filter or order (eSignatures.com API
 * reference, Templates, List). The whole set is diffed each check; more than the kit's 5000-row cap
 * fails the check with an error naming the cap. Renames are not announced.
 */
const trigger: TriggerDefinition = {
  key: "new-template",
  title: "New Template",
  description: "The run gets each template newly created in the eSignatures.com account.",
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { template_id: "4templ44-8888", title: "Rental Agreement" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await templateList.execute({}, ctx) as {
      templates?: Array<{ template_id?: unknown }>;
    };
    const templates = Array.isArray(out?.templates) ? out.templates : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: templates.map((t) => ({ key: String(t.template_id ?? ""), values: t })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
