import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  attributes: Record<string, string | string[]> | string;
}

const conversationCustomAttributesUpdate: ActionDefinition<Input> = {
  key: "conversation-custom-attributes-update",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation Custom Attributes",
  description:
    "Set custom attribute values on a conversation. Keys are custom-attribute definition ids (see Custom Attribute List); a value is a string, or an array of strings for a multi-select.",
  idempotent: true,
  params: [
    conversationIdParam,
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      required: true,
      hint: '{ "<attribute-uuid>": "value" } — or an array of strings for a multi-select.',
    },
  ],
  output: [{
    key: "data",
    type: "array",
    label: "The conversation's custom attributes after the update",
  }],

  execute(input, ctx) {
    const id = conversationId(input.conversationId);
    return new DixaClient(ctx).json(`/conversations/${id}/custom-attributes`, {
      method: "PATCH",
      body: parseAttributes(input.attributes),
    });
  },
};

/** Accept an object or a JSON string; the body is a map of definition id to string / string[]. */
export function parseAttributes(raw: unknown): Record<string, string | string[]> {
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("attributes must be an object of { definitionId: value }");
  }
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const ok = typeof v === "string" || (Array.isArray(v) && v.every((x) => typeof x === "string"));
    if (!ok) throw new Error(`attribute ${k} must be a string or an array of strings`);
    out[k] = v as string | string[];
  }
  if (Object.keys(out).length === 0) throw new Error("attributes must not be empty");
  return out;
}

export default conversationCustomAttributesUpdate;
