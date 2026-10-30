import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

test("file-get: GETs the contents route with real path separators", async () => {
  const { ctx, calls } = mockCtx([{ body: { path: "src/index.ts", sha: "abc" } }]);
  await action.execute({ owner: "acme", repository: "api", filePath: "src/index.ts" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/contents/src/index.ts",
  );
});

test("file-get: a nested path renders as real segments, each percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { owner: "acme", repository: "api", filePath: "cfg/documents/a.md" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/contents/cfg/documents/a.md",
  );
});

test("file-get: passes the ref through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { owner: "acme", repository: "api", filePath: "a.txt", ref: "develop" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("ref"), "develop");
});
