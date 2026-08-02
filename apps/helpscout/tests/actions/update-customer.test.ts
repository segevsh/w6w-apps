import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-customer.ts";

Deno.test("update-customer: builds one replace op per field actually set", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ customerId: 100, firstName: "Karl" }, ctx);
  assertEquals(out, { success: true });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v2/customers/100");
  assertEquals(JSON.parse(calls[0].body!), [{ op: "replace", path: "/firstName", value: "Karl" }]);
});

Deno.test("update-customer: several fields become several ops in one call", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ customerId: 100, firstName: "Vernon", lastName: "Bear" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [
    { op: "replace", path: "/firstName", value: "Vernon" },
    { op: "replace", path: "/lastName", value: "Bear" },
  ]);
});

Deno.test("update-customer: refuses a call that changes nothing", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute({ customerId: 100 }, ctx),
    Error,
    "set at least one field",
  );
  assertEquals(calls.length, 0);
});
