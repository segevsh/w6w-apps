import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POSTs snake_case fields and drops unset ones", async () => {
  const data = { customer_code: "CUS_1", id: 1, email: "a@b.co" };
  const { ctx, calls } = mockCtx([{ body: ok(data) }]);
  assertEquals(
    await action.execute({ email: "a@b.co", firstName: "Ada", lastName: "L", phone: "+234" }, ctx),
    data,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/customer");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.co",
    first_name: "Ada",
    last_name: "L",
    phone: "+234",
  });
});

Deno.test("customer-create: requires an email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ email: "" }, ctx),
    Error,
    "Email is required",
  );
  assertEquals(calls.length, 0);
});
