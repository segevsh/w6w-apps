import { assertEquals } from "@std/assert";
import action from "../../actions/member-remove-plan.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-remove-plan: POSTs planId and tolerates the documented empty 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await action.execute({ memberId: "mem_1", planId: "pln_free" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/members/mem_1/remove-plan");
  assertEquals(JSON.parse(calls[0].body!), { planId: "pln_free" });
  assertEquals(out, { memberId: "mem_1", planId: "pln_free", ok: true });
});

Deno.test("member-remove-plan: not marked idempotent (duplicate behaviour undocumented)", () => {
  assertEquals(action.idempotent, false);
});
