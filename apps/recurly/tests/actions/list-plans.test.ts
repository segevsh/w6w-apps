import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-plans.ts";

const ok = { status: 200, body: { object: "list", has_more: false, next: null, data: [] } };

Deno.test("list-plans: is a search action over the plan resource", () => {
  assertEquals(action.key, "list-plans");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "plan");
});

Deno.test("list-plans: GETs /plans with the state filter", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ state: "active" }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/plans");
  assertEquals(url.searchParams.get("state"), "active");
});
