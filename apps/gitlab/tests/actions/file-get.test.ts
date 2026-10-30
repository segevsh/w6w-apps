import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

test("file-get: GETs the encoded file path with a ref query", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_path: "src/index.ts" } }]);
  await action.execute({ projectId: "group/project", filePath: "src/index.ts", ref: "main" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    url.pathname,
    "/api/v4/projects/group%2Fproject/repository/files/src%2Findex.ts",
  );
  assertEquals(url.searchParams.get("ref"), "main");
});
