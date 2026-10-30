import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repository-get-issues.ts";

test("repository-get-issues: maps the filters onto GitHub's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute(
    { owner: "acme", repository: "api", state: "all", labels: "bug", perPage: 50, page: 2 },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("state"), "all");
  assertEquals(q.get("labels"), "bug");
  assertEquals(q.get("per_page"), "50");
  assertEquals(q.get("page"), "2");
});

test("repository-get-issues: is a search action", () => {
  assertEquals(action.type, "search");
});
