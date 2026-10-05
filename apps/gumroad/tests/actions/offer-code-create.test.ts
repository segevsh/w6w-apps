import { assertEquals, assertRejects } from "@std/assert";
import offerCodeCreate from "../../actions/offer-code-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": "productId-1==",
  "name": "name-1",
  "amountOff": 5,
  "offerType": "cents",
  "maxPurchaseCount": 5,
  "minimumAmountCents": 5,
  "universal": true,
};

Deno.test("offer-code-create: sends POST /v2/products/productId-1%3D%3D/offer_codes with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "offer_code": { "id": "x1", "marker": true } },
  }]);
  await offerCodeCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/offer_codes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [
    ["name", "name-1"],
    ["amount_off", "5"],
    ["offer_type", "cents"],
    ["max_purchase_count", "5"],
    ["minimum_amount_cents", "5"],
    ["universal", "true"],
  ]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("offer-code-create: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "offer_code": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await offerCodeCreate.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("offer-code-create: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(offerCodeCreate.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("offer-code-create: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(offerCodeCreate.execute(INPUT, ctx)), Error, "refused");
});
