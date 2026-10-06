import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  attributeId: string;
}

/** Delete a custom attribute. This cannot be undone. */
const customAttributeDelete: ActionDefinition<Input> = {
  key: "custom-attribute-delete",
  type: "perform",
  resource: "custom-attribute",
  title: "Delete Custom Attribute",
  description: "Delete a custom attribute. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "attributeId", "label": "Custom attribute ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/custom-attributes/${seg(input.attributeId)}`, {
      method: "DELETE",
    });
  },
};

export default customAttributeDelete;
