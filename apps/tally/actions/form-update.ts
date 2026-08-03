import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam, formStatusOptions } from "../lib/params.ts";

interface Input {
  formId: string;
  name?: string;
  status?: string;
  blocks?: unknown;
  settings?: unknown;
}

/**
 * PATCH /forms/{formId} — update a form's name, status, blocks or settings.
 *
 * **`blocks` is replace-all, not merge.** The vendor's help page states it
 * outright: when updating a form you must submit the complete blocks array,
 * because any block omitted from the request is deleted. So `blocks` is left
 * unset unless the caller supplies one, and the safe sequence for a partial
 * edit is Get Form -> mutate the returned array -> send it back whole.
 */
const formUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "form-update",
  type: "perform",
  resource: "form",
  title: "Update Form",
  description:
    "Update a form's name, status, blocks or settings. Supplying `blocks` REPLACES the whole array — omitted blocks are deleted.",
  // Re-sending the same payload converges on the same end state.
  idempotent: true,
  params: [
    formIdParam,
    { key: "name", label: "Name", type: "string", hint: "Optional. New name for the form." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: formStatusOptions,
      hint: "Optional. New status for the form.",
    },
    {
      key: "blocks",
      label: "Blocks",
      type: "json",
      hint:
        "Optional, but REPLACES the entire block array — any block you omit is deleted. Fetch the current array with Get Form first.",
    },
    { key: "settings", label: "Settings", type: "json", hint: "Optional form settings object." },
  ],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "form", type: "object", label: "The updated form" },
  ],

  async execute(input, ctx) {
    if (input.blocks !== undefined) {
      ctx.log("warn", "replacing the form's entire block array; omitted blocks are deleted", {
        formId: input.formId,
      });
    }
    const form = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/forms/${encodeURIComponent(input.formId)}`,
      {
        method: "PATCH",
        body: {
          name: input.name,
          status: input.status,
          blocks: input.blocks,
          settings: input.settings,
        },
      },
    );
    return { id: form?.id, name: form?.name, status: form?.status, form };
  },
};

export default formUpdate;
