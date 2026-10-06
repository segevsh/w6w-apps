import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";
import { USER_OUTPUT } from "../lib/params.ts";

interface Input {
  userId: number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by ID: profile, phone numbers and licence plan.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: USER_OUTPUT,

  execute(input, ctx) {
    return new RingoverClient(ctx).request("GET", `/users/${seg(input.userId)}`);
  },
};

export default userGet;
