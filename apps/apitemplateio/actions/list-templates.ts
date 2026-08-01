import type { ActionDefinition } from "@w6w/types";
import { ApiTemplateClient } from "../lib/client.ts";

interface Input {
  format?: "" | "PDF" | "JPEG";
  groupName?: string;
  limit?: number;
  offset?: number;
}

interface Template {
  template_id?: string;
  name?: string;
  status?: string;
  format?: string;
  created_at?: string;
  updated_at?: string;
  group_name?: string;
  [key: string]: unknown;
}

interface Output {
  status?: string;
  templates?: Template[];
}

/**
 * GET /v2/list-templates — every template the API key can see. The same call
 * the `api-key` auth method's `test` hook uses (with `limit=1`) to prove the
 * credential is live.
 */
const listTemplates: ActionDefinition<Input, Output> = {
  key: "list-templates",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List templates available to this account.",
  params: [
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { value: "", label: "Any" },
        { value: "PDF", label: "PDF" },
        { value: "JPEG", label: "Image" },
      ],
    },
    { key: "groupName", label: "Group name", type: "string" },
    { key: "limit", label: "Limit", type: "number", default: 300 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "templates", type: "array", label: "Templates" },
  ],

  execute(input, ctx) {
    const client = new ApiTemplateClient(ctx);
    return client.request<Output>("/v2/list-templates", {
      query: {
        format: input.format || undefined,
        group_name: input.groupName,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listTemplates;
