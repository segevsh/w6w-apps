import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import fileList from "../../actions/file-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("file-list: calls GET /file with the required purpose filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "f1" }] }]);
  const out = await fileList.execute({ purpose: "assistant" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/file");
  assertEquals(queryOf(calls[0].url), { purpose: "assistant" });
  assertEquals(out, { items: [{ id: "f1" }] });
});

/** Unlike every other list action here, `purpose` is required — no limit/date filters exist. */
test("file-list: purpose is the only param, and it is required", () => {
  const params = fileList.params ?? [];
  assertEquals(params.length, 1);
  assertEquals(params[0].key, "purpose");
  assert(params[0].required, "purpose must be required");
});
