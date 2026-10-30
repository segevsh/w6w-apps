import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import stashDelete from "../../actions/stash-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("stash-delete: DELETEs /stashes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await stashDelete.execute({ stashId: "20240215-job32" }, ctx);
  assertEquals(pathOf(calls[0].url), "/stashes/20240215-job32");
  assertEquals(calls[0].method, "DELETE");
});

test("stash-delete: rejects an invalid stash id before the request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => stashDelete.execute({ stashId: "-bad-" }, ctx));
  assertEquals(calls.length, 0);
});
