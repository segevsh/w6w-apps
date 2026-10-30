import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/merge-request-get.ts";

test("merge-request-get: GETs /projects/{id}/merge_requests/{iid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 7 } }]);
  await action.execute({ projectId: "1", mergeRequestIid: 7 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/1/merge_requests/7");
});
