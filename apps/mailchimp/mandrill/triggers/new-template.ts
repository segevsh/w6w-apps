import type { TriggerDefinition } from "@w6w/types";
import { pollTemplates } from "../lib/snapshots.ts";

const newTemplate: TriggerDefinition = {
  key: "new-template",
  title: "New Template",
  description:
    "Fires when a template is added to the Mandrill account (the whole template list is compared each check). The run gets the new template.",
  params: [],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Template slug" },
    { key: "values", type: "object", label: "Template" },
  ],
  sample: {
    change: "added",
    key: "welcome-email",
    values: { slug: "welcome-email", name: "Welcome email", created_at: "2026-11-10 09:00:00" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await pollTemplates(state, ctx);
  },
};

export default newTemplate;
