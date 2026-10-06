import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-plans.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-plans: returns the current plan and add-ons", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        current_plan: { name: "Growth", status: "active", type: "subscription", charge: "$21" },
        addons: [{ name: "Rate", status: "active", type: "subscription" }],
      },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/account/myplans");
  assertEquals((out.currentPlan as { name: string }).name, "Growth");
  assertEquals((out.addons as unknown[]).length, 1);
});

Deno.test("get-plans: missing members default to null and an empty list; 401 throws", async () => {
  const { ctx } = mockCtx([{ body: { status: "success", data: {} } }]);
  assertEquals(await run(action, {}, ctx), { currentPlan: null, addons: [] });
  const bad = mockCtx([{
    status: 401,
    body: { status: "failed", error: { code: 1000, message: "x" } },
  }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "401");
});
