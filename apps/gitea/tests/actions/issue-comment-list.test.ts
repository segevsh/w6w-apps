import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-comment-list.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

test("issue-comment-list: reads the issue's comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1 }] }], conn);
  assertEquals(await action.execute!({ repo: "web", issueNumber: 7 }, ctx), [{ id: 1 }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/acme/web/issues/7/comments");
});

test("issue-comment-list: a missing number fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web" }, ctx),
    Error,
    "`issueNumber`",
  );
  assertEquals(calls.length, 0);
  // Timeline events are elsewhere, so the count will not match the web UI.
  assert(action.description!.includes("conversation comments"), action.description);
});

test("issue-comment-list: one request, no page or limit; since is sent; limit cuts unless returnAll", async () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({ id: i + 1 }));
  const one = mockCtx([{ status: 200, body: rows }], conn);
  const cut = await action.execute!(
    { repo: "web", issueNumber: 7, since: "2026-11-10T11:58:00Z", limit: 30 },
    one.ctx,
  ) as unknown[];
  assertEquals(cut.length, 30);
  assertEquals(one.calls.length, 1);
  assertEquals(Object.fromEntries(new URL(one.calls[0].url).searchParams), {
    since: "2026-11-10T11:58:00Z",
  });
  const all = mockCtx([{ status: 200, body: rows }], conn);
  const full = await action.execute!({ repo: "web", issueNumber: 7, returnAll: true }, all.ctx);
  assertEquals((full as unknown[]).length, 120);
  assertEquals(all.calls.length, 1);
  assertEquals(new URL(all.calls[0].url).search, "");
});
