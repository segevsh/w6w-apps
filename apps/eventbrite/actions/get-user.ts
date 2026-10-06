import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  expand?: string;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a user account. Defaults to the connected user (`me`).",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Leave empty for the connected user.",
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "e.g. `assortment` to include the user's assortment package.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "emails", type: "array", label: "Emails" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const id = input.userId ? encodeURIComponent(input.userId) : "me";
    return client.request(`/users/${id}/`, { query: { expand: input.expand } });
  },
};

export default getUser;
