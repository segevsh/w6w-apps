import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/coupon-create.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

const discounts = [{ value: "10", valueType: "fixed", perTicket: false }];

Deno.test("coupon-create: builds the documented body from codes and discounts", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 77 }) }]);
  const out = await exec(action, {
    name: "Spring",
    currency: "USD",
    available: "-1",
    productId: "4",
    formId: "23",
    codes: "SPRING, SPRING2",
    discounts: JSON.stringify(discounts),
    expires: "2026-12-31T00:00:00Z",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/coupons");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Spring",
    currency: "USD",
    available: -1,
    productId: 4,
    discounts,
    codes: [{ code: "SPRING" }, { code: "SPRING2" }],
    formId: 23,
    expires: "2026-12-31T00:00:00Z",
  });
  assertEquals(out.coupon, { id: 77 });
  assertEquals(action.idempotent, false);
});

Deno.test("coupon-create: formId and expires are omitted when blank", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await exec(action, {
    name: "n",
    currency: "USD",
    available: 1,
    productId: 4,
    codes: "A",
    discounts,
    formId: "",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("formId" in sent) && !("expires" in sent));
});

Deno.test("coupon-create: no codes, or no discounts, never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => exec(action, { codes: " , ", discounts }, ctx));
  await assertRejects(() => exec(action, { codes: "A", discounts: "[]" }, ctx));
  await assertRejects(() => exec(action, { codes: "A", discounts: "{bad" }, ctx));
  assertEquals(calls.length, 0);
});
