import type { ActionDefinition } from "@w6w/types";
import { HexClient, type HexCursorPage } from "../lib/client.ts";
import { CURSOR_OUTPUT, type CursorInput, cursorParams } from "../lib/params.ts";

/** `GET /v1/collections` — collections that group projects, with their sharing settings. */
type Input = CursorInput;

const collectionList: ActionDefinition<Input> = {
  key: "collection-list",
  type: "search",
  resource: "collection",
  title: "List Collections",
  description: "List the workspace's collections.",
  params: [...cursorParams(100)],
  output: [...CURSOR_OUTPUT],

  execute(input, ctx) {
    return new HexClient(ctx).json<HexCursorPage<unknown>>("/collections", {
      query: { limit: input.limit, after: input.after },
    });
  },
};

export default collectionList;
