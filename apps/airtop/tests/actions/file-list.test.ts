import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fileList from "../../actions/file-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("file-list: filters by session id and paginates", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ files: [{ id: "f1" }], pagination: {} }) }]);
  const out = await fileList.execute({ sessionIds: "s1", limit: 5 }, ctx) as { files: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/files");
  assertEquals(queryOf(calls[0].url), { sessionIds: "s1", limit: "5" });
  assertEquals(out.files.length, 1);
});
