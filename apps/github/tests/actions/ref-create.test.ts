import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/ref-create.ts";

test("ref-create: POSTs the plural git/refs route with a JSON body of ref + sha", async () => {
  const { ctx, calls } = mockCtx([{ body: { ref: "refs/heads/main", object: { sha: "abc" } } }]);
  await action.execute({ owner: "acme", repository: "api", branch: "main", fromSha: "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/git/refs");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { ref: "refs/heads/main", sha: "abc" });
});

test("ref-create: a branch name containing a slash renders in the body, not the URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: { ref: "refs/heads/feat/x", object: { sha: "abc" } },
  }]);
  await action.execute(
    { owner: "acme", repository: "api", branch: "feat/x", fromSha: "abc" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/git/refs");
  assertEquals(JSON.parse(calls[0].body!), { ref: "refs/heads/feat/x", sha: "abc" });
});

test("ref-create: a dot-segment branch name is refused with no fetch made", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() =>
    action.execute({ owner: "acme", repository: "api", branch: "..", fromSha: "abc" }, ctx)
  );
  assertEquals(calls.length, 0);
});

test("ref-create: returns GitHub's envelope verbatim — no top-level sha", async () => {
  const { ctx } = mockCtx([{
    body: { ref: "refs/heads/main", object: { sha: "abc", type: "commit" } },
  }]);
  const result = await action.execute(
    { owner: "acme", repository: "api", branch: "main", fromSha: "abc" },
    ctx,
  );
  assertEquals((result as { object: { sha: string } }).object.sha, "abc");
  assertEquals("sha" in (result as object), false);
});
