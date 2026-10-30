import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/issue-thread-list.ts";
import { mockCtx } from "../_helpers.ts";

test("issue-thread-list: GETs /issues/{id}/threads", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "th1", name: "Internal" }] } }]);
  const out = await action.execute!({ id: "i1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/i1/threads");
  assertEquals(out, { threads: [{ id: "th1", name: "Internal" }] });
});

test("issue-thread-list: no data means no threads", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute!({ id: "i1" }, ctx), { threads: [] });
});
