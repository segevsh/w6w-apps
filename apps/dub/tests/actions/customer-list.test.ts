import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-list: sends GET /customers with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "cus_1" }] }]);
  const out = await action.execute!(
    { "email": "a@b.com", "sortBy": "saleAmount", "pageSize": 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/customers");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "email": "a@b.com",
    "sortBy": "saleAmount",
    "pageSize": "10",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "customers": [{ "id": "cus_1" }] });
});

Deno.test("customer-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "cus_1" }] }]);
  await action.execute!({ "email": "a@b.com", "sortBy": "saleAmount", "pageSize": 10 }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("customer-list: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ "email": "a@b.com", "sortBy": "saleAmount", "pageSize": 10 }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("customer-list: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
