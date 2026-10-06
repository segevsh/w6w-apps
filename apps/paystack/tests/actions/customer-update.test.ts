import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-update.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PUTs only the given fields to /customer/{code}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ customer_code: "CUS_1" }) }]);
  await action.execute({ code: "CUS_1", firstName: "Ada" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/customer/CUS_1");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Ada" });
});

Deno.test("customer-update: refuses an empty update and a missing code without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ code: "CUS_1" }, ctx),
    Error,
    "Nothing to update",
  );
  await assertRejects(
    async () => await action.execute({ code: "", firstName: "A" }, ctx),
    Error,
    "Customer code",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, true);
});
