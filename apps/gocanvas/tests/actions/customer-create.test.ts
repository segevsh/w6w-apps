import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POST /api/v3/customers with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 11 } }]);
  const out = await action.execute(
    {
      "customerType": "business",
      "businessName": "Chicago Inc",
      "contactEmail": "x@y.co",
      "code": "C1",
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/customers");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "customer_type": "business",
    "business_name": "Chicago Inc",
    "contact_email": "x@y.co",
    "code": "C1",
  });
  assertEquals(out, { "id": 11 });

  await assertRejects(
    async () => await action.execute({ customerType: "business" }, mockCtx().ctx),
    Error,
    "business name",
  );
  await assertRejects(
    async () =>
      await action.execute({ customerType: "individual", contactFirstName: "Ben" }, mockCtx().ctx),
    Error,
    "first and last name",
  );
});
