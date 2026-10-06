import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `GET /users/{uuid}` */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a single user of your workspace.",
  params: [
    {
      key: "uuid",
      label: "User UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", `/users/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default userGet;
