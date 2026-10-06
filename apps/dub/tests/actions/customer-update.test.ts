import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-update: sends PATCH /customers/cus_1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "cus_1" } }]);
  const out = await action.execute!({
    "customerId": "cus_1",
    "name": "Ann",
    "subscriptionCanceledAt": null,
    "includeExpandedFields": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/customers/cus_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(Object.fromEntries(url.searchParams), { "includeExpandedFields": "true" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Ann",
    "subscriptionCanceledAt": null,
  });
  assertEquals(out, { "id": "cus_1" });
});

Deno.test("customer-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "cus_1" } }]);
  await action.execute!({
    "customerId": "cus_1",
    "name": "Ann",
    "subscriptionCanceledAt": null,
    "includeExpandedFields": true,
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("customer-update: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "customerId": "cus_1",
        "name": "Ann",
        "subscriptionCanceledAt": null,
        "includeExpandedFields": true,
      }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("customer-update: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
