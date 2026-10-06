import type { ActionDefinition } from "@w6w/types";
import { call, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput } from "../lib/params.ts";

/** `GET /operators`. */
type Input = { cursor?: string };

const operatorList: ActionDefinition<Input> = {
  key: "operator-list",
  type: "read",
  resource: "operator",
  title: "List Operators",
  description: "List chat agents (operators) with their role, active flag and last-seen time.",
  params: [cursorParam],
  output: listOutput("Operators [{id, active, email, name, role, picture, last_seen}]"),
  async execute(input, ctx) {
    const body = await call(ctx, "GET", "/operators", { query: pick(input, ["cursor"]) as never });
    return listResult(body, "operators");
  },
};

export default operatorList;
