import type { ActionDefinition } from "@w6w/types";
import { idOf, PardotClient, unset } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

interface Input {
  listId: number;
  prospectId: number;
  optedOut?: boolean;
  fields?: string;
}

const DEFAULT_FIELDS = "id,listId,prospectId,optedOut,createdAt";

const listMembershipCreate: ActionDefinition<Input> = {
  key: "list-membership-create",
  type: "perform",
  resource: "list-membership",
  title: "Add Prospect to List",
  description: "Put a prospect on a list.",
  idempotent: false,
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
    { key: "prospectId", label: "Prospect ID", type: "number", required: true },
    {
      key: "optedOut",
      label: "Opted out",
      type: "boolean",
      hint: "Add the prospect already unsubscribed from this list.",
    },
    fieldsParam(DEFAULT_FIELDS),
  ],
  output: [
    { key: "id", type: "number", label: "List membership ID" },
    { key: "listId", type: "number", label: "List ID" },
    { key: "prospectId", type: "number", label: "Prospect ID" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      listId: idOf(input.listId, "listId"),
      prospectId: idOf(input.prospectId, "prospectId"),
    };
    const optedOut = unset(input.optedOut);
    if (optedOut !== undefined) body.optedOut = optedOut;
    const created = await new PardotClient(ctx).request("/list-memberships", {
      method: "POST",
      query: { fields: unset(input.fields) ?? DEFAULT_FIELDS },
      body,
    });
    return created ?? { created: true };
  },
};

export default listMembershipCreate;
