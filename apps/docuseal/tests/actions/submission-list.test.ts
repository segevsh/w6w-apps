import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-list.ts";

test("submission-list: lists with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: 1 }], pagination: {} } }]);
  assertEquals(await action.execute!({}, ctx), [{ id: 1 }]);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "10");
});

test("submission-list: filters reach the wire, including a false archived", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await action.execute!({ templateId: 5, status: "completed", q: "ada", archived: false }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("template_id"), "5");
  assertEquals(q.get("status"), "completed");
  assertEquals(q.get("q"), "ada");
  assertEquals(q.get("archived"), "false");
});
