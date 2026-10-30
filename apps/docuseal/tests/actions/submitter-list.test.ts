import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submitter-list.ts";

test("submitter-list: lists with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: 7 }], pagination: {} } }]);
  assertEquals(await action.execute!({}, ctx), [{ id: 7 }]);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "10");
});

test("submitter-list: filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await action.execute!({
    submissionId: 3,
    q: "john",
    completedAfter: "2024-03-05 9:32:20",
    externalId: "ext1",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("submission_id"), "3");
  assertEquals(q.get("q"), "john");
  assertEquals(q.get("completed_after"), "2024-03-05 9:32:20");
  assertEquals(q.get("external_id"), "ext1");
});
