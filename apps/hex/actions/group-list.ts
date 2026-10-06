import type { ActionDefinition } from "@w6w/types";
import { HexClient, type HexCursorPage } from "../lib/client.ts";
import { CURSOR_OUTPUT, type CursorInput, cursorParams } from "../lib/params.ts";

/** `GET /v1/groups` — workspace groups, each `{ id, name, createdAt }`. */
type Input = CursorInput;

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List the workspace's user groups.",
  params: [...cursorParams(100)],
  output: [...CURSOR_OUTPUT],

  execute(input, ctx) {
    return new HexClient(ctx).json<HexCursorPage<unknown>>("/groups", {
      query: { limit: input.limit, after: input.after },
    });
  },
};

export default groupList;
