import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/identify.ts";

Deno.test("identify: PUTs attributes directly to /customers/:id (no wrapper key)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { personId: "u1", attributes: { email: "a@b.com", plan: "pro" } },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/customers/u1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", plan: "pro" });
  assertEquals(result, { success: true });
});

Deno.test("identify: attributes default to an empty object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ personId: "u1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("identify: rejects a blank personId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ personId: "  " }, ctx),
    Error,
    "`personId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("identify: uses the eu host when the connection's region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute!({ personId: "u1" }, ctx);
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/customers/u1");
});

Deno.test("identify: URL-encodes the personId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ personId: "a b/c" }, ctx);
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/customers/a%20b%2Fc");
});

Deno.test("identify: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { meta: { error: "invalid credentials" } } }]);
  const err = await assertRejects(
    async () => await action.execute!({ personId: "u1" }, ctx),
    Error,
    "Customer.io 401",
  );
  assert(err.message.includes("invalid credentials"));
});
