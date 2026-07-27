import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

Deno.test("lead-create: POSTs /leads and nests value under { amount, currency }", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: "uuid" } } }]);
  await action.execute!(
    { title: "Warm lead", personId: 3, amount: 1000, currency: "EUR" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/leads");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "Warm lead");
  assertEquals(body.person_id, 3);
  assertEquals(body.value, { amount: 1000, currency: "EUR" });
});

Deno.test("lead-create: omits value when no amount is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: "uuid" } } }]);
  await action.execute!({ title: "Bare lead", organizationId: 5 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.value, undefined);
  assertEquals(body.organization_id, 5);
});
