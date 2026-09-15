import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/** `GET /template/{id}` — a single template's full configuration. */
interface Input {
  templateId: string;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch a single template by id.",
  params: [templateIdParam],
  output: [
    { key: "id", type: "number", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status (DRAFT or PROD)" },
    { key: "engine", type: "string", label: "Engine (TXT or OCR)" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(`/template/${encodeId(input.templateId)}`);
  },
};

export default templateGet;
