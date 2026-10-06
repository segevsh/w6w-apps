import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient, unset } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Input {
  formDir: string;
  resultsLabels?: string;
}

const formItemsList: ActionDefinition<Input> = {
  key: "form-items-list",
  type: "search",
  resource: "form",
  title: "List Form Items",
  description:
    "List a form's items (questions). Match each item's `id` against result item ids to label result data.",
  params: [
    formDir,
    {
      key: "resultsLabels",
      label: "Results Labels ID",
      type: "string",
      advanced: true,
      hint: "Apply a Results Labels set instead of the question labels.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Items" }],

  async execute(input, ctx) {
    const res = await new FormsiteClient(ctx).request<{ items?: unknown[] }>(
      `/forms/${encodeURIComponent(input.formDir)}/items`,
      { query: { results_labels: unset(input.resultsLabels) } },
    );
    return { items: res.items ?? [] };
  },
};

export default formItemsList;
