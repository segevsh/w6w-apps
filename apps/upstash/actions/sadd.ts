import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  member: string;
}

const sadd: ActionDefinition<Input> = {
  key: "sadd",
  type: "perform",
  resource: "set",
  title: "Add Member (Set)",
  description: "Add a member to a set, creating it if it doesn't exist.",
  // Adding an already-present member is a no-op — safe to retry.
  idempotent: true,
  params: [keyParam(), { key: "member", label: "Member", type: "string", required: true }],
  output: resultOutput("number", "1 if the member is new, 0 if it was already present"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("sadd", input.key, input.member);
  },
};

export default sadd;
