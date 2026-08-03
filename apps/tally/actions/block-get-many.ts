import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
}

/**
 * GET /forms/{formId}/blocks — the form's raw block layout.
 *
 * Every block, not just the answerable ones: headings, text, images, dividers
 * and page breaks come back alongside the inputs. This is the array to mutate
 * and hand to Update Blocks.
 */
const blockGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "block-get-many",
  type: "read",
  resource: "block",
  title: "Get Many Blocks",
  description: "List a form's blocks — the full layout, including non-input blocks.",
  params: [formIdParam],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Form name" },
    { key: "blocks", type: "array", label: "Blocks" },
    { key: "count", type: "number", label: "Number of blocks" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<
      { id?: string; name?: string; blocks?: unknown[] }
    >(`/forms/${encodeURIComponent(input.formId)}/blocks`);
    const blocks = body?.blocks ?? [];
    return { id: body?.id, name: body?.name, blocks, count: blocks.length };
  },
};

export default blockGetMany;
