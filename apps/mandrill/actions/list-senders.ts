import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

const listSenders: ActionDefinition<Input> = {
  key: "list-senders",
  type: "read",
  resource: "sender",
  title: "List Senders",
  description:
    "Return the senders that have tried to use this account, verified and unverified (POST /users/senders.json).",
  params: [],
  output: [{ key: "senders", type: "array", label: "Senders" }],

  execute(_input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/users/senders.json", {});
  },
};

export default listSenders;
