import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-create.ts";
import { mockCtx } from "../_helpers.ts";

interface Out {
  data: unknown;
  meta: { request_id: string };
  nextPage?: number;
  nextCursor?: string;
}

Deno.test("list-create: sends POST to the documented path", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: "x1" }],
      meta: { request_id: "r1", pagination: { next_cursor: "nc", page_num: 1, page_count: 3 } },
    },
  }]);
  const out = await action.execute!(
    { "name": "Hot", "scope": "company", "accountId": "A1" },
    ctx,
  ) as Out;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.leadfeeder.com/v1/lists?account_id=A1");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": { "type": "list", "attributes": { "name": "Hot", "scope": "company" } },
  });
  assertEquals(out.data, [{ id: "x1" }]);
  assertEquals(out.meta.request_id, "r1");
});

Deno.test("list-create: a vendor error surfaces its code", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      errors: [{ code: "insufficient_entitlements", title: "Plan lacks access" }],
      meta: { request_id: "r2" },
    },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ "name": "Hot", "scope": "company", "accountId": "A1" }, ctx),
    Error,
    "HTTP 403 — insufficient_entitlements: Plan lacks access",
  );
});
