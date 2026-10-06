import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `DELETE /users/{uuid}` */
const userDeactivate: ActionDefinition<Input> = {
  key: "user-deactivate",
  type: "perform",
  resource: "user",
  title: "Deactivate User",
  description: "Deactivate a user of your workspace.",
  idempotent: true,
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
    const res = await new LeexiClient(ctx).request("DELETE", `/users/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default userDeactivate;
