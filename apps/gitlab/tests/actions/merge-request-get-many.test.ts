import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/merge-request-get-many.ts";

test("merge-request-get-many: GETs /projects/{id}/merge_requests with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ projectId: "1", state: "merged", targetBranch: "main", perPage: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/projects/1/merge_requests");
  assertEquals(url.searchParams.get("state"), "merged");
  assertEquals(url.searchParams.get("target_branch"), "main");
  assertEquals(url.searchParams.get("per_page"), "5");
});
