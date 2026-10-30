import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-update.ts";

test("entry-update: PATCHes /entries/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ entryId: 84434, fieldValues: { "25": "Jane" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/84434`);
  assertEquals(bodyOf(calls), { "25": "Jane" });
});

test("entry-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
