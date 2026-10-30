import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/ref-get.ts";

test("ref-get: GETs the singular git/ref route for a plain branch name", async () => {
  const { ctx, calls } = mockCtx([{ body: { ref: "refs/heads/main", object: { sha: "abc" } } }]);
  await action.execute({ owner: "acme", repository: "api", branch: "main" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/git/ref/heads/main");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

test("ref-get: a branch name containing a slash renders as a real segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { ref: "refs/heads/feat/x", object: { sha: "abc" } } }]);
  await action.execute({ owner: "acme", repository: "api", branch: "feat/x" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/git/ref/heads/feat/x");
});

test("ref-get: a dot-segment branch name is refused", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => action.execute({ owner: "acme", repository: "api", branch: ".." }, ctx));
});

test("ref-get: returns GitHub's envelope verbatim — no top-level sha", async () => {
  const { ctx } = mockCtx([{
    body: { ref: "refs/heads/main", object: { sha: "abc", type: "commit" } },
  }]);
  const result = await action.execute({ owner: "acme", repository: "api", branch: "main" }, ctx);
  assertEquals((result as { object: { sha: string } }).object.sha, "abc");
  assertEquals("sha" in (result as object), false);
});
