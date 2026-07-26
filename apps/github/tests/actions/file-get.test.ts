import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

Deno.test("file-get: GETs the contents route with the path encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { path: "src/index.ts", sha: "abc" } }]);
  await action.execute({ owner: "acme", repository: "api", filePath: "src/index.ts" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/contents/src%2Findex.ts",
  );
});

Deno.test("file-get: passes the ref through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { owner: "acme", repository: "api", filePath: "a.txt", ref: "develop" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("ref"), "develop");
});
