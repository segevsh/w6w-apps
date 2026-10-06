import type { ActionDefinition } from "@w6w/types";
import { DixaClient, encodeId } from "../lib/client.ts";
import { parseAttributes } from "./conversation-custom-attributes-update.ts";

interface Input {
  userId: string;
  attributes: Record<string, string | string[]> | string;
}

const endUserCustomAttributesUpdate: ActionDefinition<Input> = {
  key: "end-user-custom-attributes-update",
  type: "perform",
  resource: "end-user",
  title: "Update End User Custom Attributes",
  description:
    "Set custom attribute values on an end user. Keys are custom-attribute definition ids (see Custom Attribute List).",
  idempotent: true,
  params: [
    { key: "userId", label: "End user id", type: "string", required: true },
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
    label: "The end user's custom attributes after the update",
  }],

  execute(input, ctx) {
    const id = encodeId(input.userId, "userId");
    return new DixaClient(ctx).json(`/endusers/${id}/custom-attributes`, {
      method: "PATCH",
      body: parseAttributes(input.attributes),
    });
  },
};

export default endUserCustomAttributesUpdate;
