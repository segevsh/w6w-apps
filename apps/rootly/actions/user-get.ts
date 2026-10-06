import type { ActionDefinition } from "@w6w/types";
import { itemResult, RootlyClient, seg, strList } from "../lib/client.ts";

interface Input {
  id: string;
  include?: string[] | string;
}

/** `GET /v1/users/{id}` */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by ID.",
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load, comma-separated: email_addresses, phone_numbers, devices, role, on_call_role, teams, schedules, notification_rules.",
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", `/v1/users/${seg(input.id)}`, {
      query: {
        "include": strList(input.include)?.join(","),
      },
    });
    return itemResult(res);
  },
};

export default userGet;
