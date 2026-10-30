import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-archive.ts";

test("board-archive: sends archive_board with the board id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { archive_board: { id: "b1", state: "archived" } } },
  }]);
  await action.execute({ boardId: "b1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("archive_board(board_id: $id)"), true);
  assertEquals(sent.variables, { id: "b1" });
});

test("board-archive: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
