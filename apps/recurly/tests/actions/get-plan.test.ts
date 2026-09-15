import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-plan.ts";

Deno.test("get-plan: is a read action requiring planId", () => {
  assertEquals(action.key, "get-plan");
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "planId")!;
  assertEquals(p.required, true);
});

Deno.test("get-plan: GETs /plans/{id}, accepting a `code-` prefixed lookup", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1", code: "gold" } }]);
  await action.execute({ planId: "code-gold" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/plans/code-gold");
});
