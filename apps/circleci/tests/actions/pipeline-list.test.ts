import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-list.ts";

Deno.test("pipeline-list: GETs /project/{slug}/pipeline", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { items: [{ id: "pipe1" }], next_page_token: null } },
  ]);
  const result = await action.execute!({ projectSlug: "gh/org/repo" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/project/gh/org/repo/pipeline");
  assertEquals(result, { items: [{ id: "pipe1" }], next_page_token: null });
});

Deno.test("pipeline-list: filters by branch and forwards page-token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  await action.execute!(
    { projectSlug: "gh/org/repo", branch: "main", pageToken: "cursor123" },
    ctx,
  );

  assertStringIncludes(calls[0].url, "branch=main");
  assertStringIncludes(calls[0].url, "page-token=cursor123");
});

Deno.test("pipeline-list: requires projectSlug", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "projectSlug");
});
