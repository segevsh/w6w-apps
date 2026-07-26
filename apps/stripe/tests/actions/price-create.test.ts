import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/price-create.ts";

Deno.test("price-create: a blank interval makes a one-off price", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "price_1" } }]);
  await action.execute(
    { productId: "prod_1", unitAmount: 2000, currency: "usd", recurringInterval: "" },
    ctx,
  );
  assertEquals(calls[0].body, "product=prod_1&unit_amount=2000&currency=usd");
});

Deno.test("price-create: an interval nests under recurring[...]", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      productId: "prod_1",
      unitAmount: 2000,
      currency: "usd",
      recurringInterval: "month",
      intervalCount: 3,
    },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("recurring[interval]"), "month");
  assertEquals(body.get("recurring[interval_count]"), "3");
});

Deno.test("price-create: says plainly that prices are immutable", () => {
  assert(action.description?.includes("immutable"));
});
