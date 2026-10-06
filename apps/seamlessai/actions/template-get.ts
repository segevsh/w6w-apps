import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, segment } from "../lib/client.ts";

/** `GET /api/client/v2/templates/{id}` — Get Template. */
interface Input {
  id: string;
  type?: string;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Get one template, including its body.",
  params: [
    {
      key: "id",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "Template ID from the matching list action.",
    },
    { key: "type", label: "Type", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "GET",
      `/templates/${segment(input.id, "Template ID")}`,
      { query: compact({ type: input.type }) as Record<string, string | number | boolean> },
    );
  },
};

export default templateGet;
