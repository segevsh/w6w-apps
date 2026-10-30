import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/folder-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("folder-list: GETs /links/folders/{domainId} and returns the body untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "f1" }] }]);
  const out = await action.execute({ domainId: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/folders/7");
  assertEquals(out.result, [{ id: "f1" }]);
});
