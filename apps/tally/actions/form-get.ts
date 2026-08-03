import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
}

/**
 * GET /forms/{formId} — one form.
 *
 * Richer than a list entry: the detail response is the `Form` object *plus*
 * `settings` and the full `blocks` array, which is what Update Form needs as
 * its starting point.
 */
const formGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Retrieve a single form, including its settings and full block list.",
  params: [formIdParam],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "blocks", type: "array", label: "Blocks" },
    { key: "settings", type: "object", label: "Settings" },
    { key: "form", type: "object", label: "The full form object" },
  ],

  async execute(input, ctx) {
    const form = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/forms/${encodeURIComponent(input.formId)}`,
    );
    return {
      id: form?.id,
      name: form?.name,
      status: form?.status,
      blocks: form?.blocks ?? [],
      settings: form?.settings,
      form,
    };
  },
};

export default formGet;
