import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
  blocks: unknown;
  settings?: unknown;
}

/**
 * PATCH /forms/{formId}/blocks — replace a form's block array.
 *
 * Same replace-all semantics as Update Form: the array you send becomes the
 * form, and any block missing from it is deleted. Read the current array with
 * Get Many Blocks, mutate it, send it back whole.
 *
 * This is the endpoint behind the common "update a dropdown's options without
 * shipping code" use case Tally's own help page advertises.
 */
const blockUpdateMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "block-update-many",
  type: "perform",
  resource: "block",
  title: "Update Blocks",
  description:
    "Replace a form's block array (and optionally its settings). Omitted blocks are DELETED.",
  idempotent: true,
  params: [
    formIdParam,
    {
      key: "blocks",
      label: "Blocks",
      type: "json",
      required: true,
      hint:
        "The COMPLETE block array — anything omitted is deleted. Fetch the current array with Get Many Blocks first. Schema: https://developers.tally.so/blocks-reference",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      hint: "Optional form settings object to apply alongside the blocks.",
    },
  ],
  output: [
    { key: "formId", type: "string", label: "Form ID" },
    { key: "result", type: "object", label: "The API response" },
  ],

  async execute(input, ctx) {
    ctx.log("warn", "replacing the form's entire block array; omitted blocks are deleted", {
      formId: input.formId,
    });
    const result = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/forms/${encodeURIComponent(input.formId)}/blocks`,
      { method: "PATCH", body: { blocks: input.blocks, settings: input.settings } },
    );
    return { formId: input.formId, result };
  },
};

export default blockUpdateMany;
