import type { TriggerDefinition } from "@w6w/types";
import { pollForms } from "../lib/snapshots.ts";

const trigger: TriggerDefinition<{ siteId?: string }> = {
  key: "new-form",
  title: "New Form",
  description:
    "Fires when Netlify detects a new form on a site (a site has a handful of forms, so the whole list is compared each check). The run gets the form.",
  params: [{
    key: "siteId",
    label: "Site ID",
    type: "string",
    required: true,
    hint: "The site whose forms to watch.",
  }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Form ID" },
    { key: "values", type: "object", label: "Form" },
  ],
  sample: {
    change: "added",
    key: "5d6e7f8a9b0c1d2e3f4a5b6d",
    values: { id: "5d6e7f8a9b0c1d2e3f4a5b6d", name: "contact", submission_count: 0 },
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const siteId = String(params?.siteId ?? "").trim();
    if (!siteId) throw new Error("`siteId` is required");
    return await pollForms(state, siteId, ctx);
  },
};

export default trigger;
