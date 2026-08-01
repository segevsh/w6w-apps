import type { ActionDefinition } from "@w6w/types";
import { ApiTemplateClient } from "../lib/client.ts";

interface Input {
  templateId?: string;
  transactionType?: "" | "PDF" | "JPEG" | "MERGE";
  limit?: number;
  offset?: number;
}

interface Output {
  status?: string;
  objects?: Record<string, unknown>[];
}

/**
 * GET /v2/list-objects — previously generated PDFs/images, most recent first.
 * Useful for looking up a `transaction_ref` returned by Create PDF / Create
 * Image after the fact.
 */
const listObjects: ActionDefinition<Input, Output> = {
  key: "list-objects",
  type: "read",
  resource: "object",
  title: "List Generated Objects",
  description: "List previously generated PDFs/images and their metadata.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "Filter to objects generated from this template.",
    },
    {
      key: "transactionType",
      label: "Type",
      type: "select",
      options: [
        { value: "", label: "Any" },
        { value: "PDF", label: "PDF" },
        { value: "JPEG", label: "Image" },
        { value: "MERGE", label: "Merged PDF" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 300 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "objects", type: "array", label: "Objects" },
  ],

  execute(input, ctx) {
    const client = new ApiTemplateClient(ctx);
    return client.request<Output>("/v2/list-objects", {
      query: {
        template_id: input.templateId,
        transaction_type: input.transactionType || undefined,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listObjects;
