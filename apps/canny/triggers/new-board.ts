import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import boardList from "../actions/board-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `board-list`. Canny returns every board in one unpaginated response, "in no particular
 * order" (https://developers.canny.io/api-reference, verified 2026-11-10) — a small bounded
 * collection, so it is polled as a snapshot and only additions are emitted.
 */
const trigger: TriggerDefinition = {
  key: "new-board",
  title: "New Board",
  description:
    "The run gets each newly created Canny board (the whole board list is compared on every check).",
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Board ID" },
    {
      key: "values",
      type: "object",
      label: "Board (id, name, created, postCount, isPrivate, url)",
    },
  ],
  sample: {
    change: "added",
    key: "5f3a1b2c3d4e5f6a7b8c9d01",
    values: {
      id: "5f3a1b2c3d4e5f6a7b8c9d01",
      name: "Feature Requests",
      created: "2026-11-09T09:00:00.000Z",
      postCount: 0,
      isPrivate: false,
    },
  },
  minIntervalMs: 900_000,
  async poll({ state }, ctx) {
    const result = await boardList.execute({}, ctx);
    return await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true },
      rows: itemsAt("boards")(result).map((board) => ({ key: idOf(board), values: board })),
    });
  },
};

export default trigger;
