import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-product-purchase.ts";
import { actionBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-product-purchase: is a non-idempotent perform action on the contact id", () => {
  assertEquals(action.key, "contact-product-purchase");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params![0].key, "id");
  assertEquals(action.params![0].required, true);
});

Deno.test("contact-product-purchase: POSTs /customers/11/actions/product_purchase with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: actionBody(true, "done") }]);
  const out = await action.execute({ id: 11, productId: 5 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/customers/11/actions/product_purchase");
  assertEquals(JSON.parse(calls[0].body!), { "product_id": 5 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { success: true, message: "done" });
});

Deno.test("contact-product-purchase: HTTP 200 with success:false is a failure, not a result", async () => {
  const { ctx } = mockCtx([{ body: actionBody(false, "Contact not found") }]);
  await assertRejects(
    async () => await action.execute({ id: 11, productId: 5 }, ctx),
    Error,
    "Contact not found",
  );
});

Deno.test("contact-product-purchase: a 422 surfaces the errors array", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: ["bad one", "bad two"] } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, productId: 5 }, ctx),
    Error,
    "bad one; bad two",
  );
});

Deno.test("contact-product-purchase: a 200 without a success flag is an error", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, productId: 5 }, ctx),
    Error,
    "data.success",
  );
});
