import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { USER_OUTPUT, USER_SAMPLE } from "../lib/outputs.ts";

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
      type: "multiselect",
      options: [{ value: "assortment", label: "Assortment" }],
      config: { valueFormat: "csv" },
      hint: "Include the user’s assortment package.",
    },
  ],
  output: USER_OUTPUT,
  sample: USER_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const id = input.userId ? encodeURIComponent(input.userId) : "me";
    return client.request(`/users/${id}/`, { query: { expand: input.expand } });
  },
};

export default getUser;
