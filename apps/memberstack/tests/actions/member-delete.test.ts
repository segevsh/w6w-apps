import { assertEquals } from "@std/assert";
import memberDelete from "../../actions/member-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-delete: bare delete sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "mem_1" } } }]);
  const out = await memberDelete.execute({ memberId: "mem_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/members/mem_1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "mem_1" });
});

Deno.test("member-delete: Stripe flags are sent only when true", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "mem_1" } } }]);
  await memberDelete.execute(
    { memberId: "mem_1", deleteStripeCustomer: true, cancelStripeSubscriptions: false },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { deleteStripeCustomer: true });
});
