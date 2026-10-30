import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-delete.ts";

test("entry-delete: throws without a network call when confirm is not true", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute({ entryId: 1, confirm: false }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

test("entry-delete: DELETEs /entries/{id} when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ entryId: 1, confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/1`);
});
