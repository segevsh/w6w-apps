import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leadList from "../../actions/lead-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("lead-list: POSTs the filters as the body, dropping unset ones", async () => {
  const { ctx, calls } = mockCtx([
    { body: { totalCount: 1, page: 0, pageSize: 100, leads: [{ id: 1 }] } },
  ]);
  await leadList.execute({ status: 0, page: 0, pageSize: 100 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/list");
  assertEquals(JSON.parse(calls[0].body!), { status: 0, page: 0, pageSize: 100 });
});

test("lead-list: status 0 (New) survives compact() — it must not be dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadList.execute({ status: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, 0);
});
